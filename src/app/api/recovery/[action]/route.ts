import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { assertOrigin, HttpError } from '@/shared/lib/auth';
import { collection } from '@/shared/lib/db';
import { fail, jsonBody } from '@/shared/lib/http';
import { queueMail } from '@/shared/lib/notifications';
import type { User } from '@/shared/lib/types';
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  try {
    await assertOrigin();
    const { action } = await ctx.params;
    const body = await jsonBody(req);
    const limits = await collection<{ _id: string; count: number; expiresAt: Date }>(
      'recovery_limits',
    );
    await limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const ip = digest(req.headers.get('x-forwarded-for') || 'local');
    const window = Math.floor(Date.now() / 900000);
    const key = ip + ':' + window;
    const rate = await limits.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 900000) } },
      { upsert: true, returnDocument: 'after' },
    );
    if (rate && rate.count > 10)
      throw new HttpError(429, 'Too many requests. Please wait 15 minutes.');
    const tokens = await collection<{ _id: string; userId: string; expiresAt: Date }>(
      'password_resets',
    );
    await tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const users = await collection<User>('users');
    if (action === 'request') {
      const { email } = z
        .object({
          email: z
            .email()
            .max(200)
            .transform((v) => v.toLowerCase()),
        })
        .parse(body);
      const user = await users.findOne({ email });
      if (user) {
        const token = randomBytes(32).toString('hex');
        await tokens.deleteMany({ userId: user._id });
        await tokens.insertOne({
          _id: digest(token),
          userId: user._id,
          expiresAt: new Date(Date.now() + 1800000),
        });
        const link =
          (process.env.APP_URL || 'http://127.0.0.1:3000') +
          '/account/reset-password?token=' +
          token;
        await queueMail(
          'recovery:' + digest(token),
          email,
          'Reset your Kashmir Se password',
          `Use this link within 30 minutes: ${link}\n\nIf you did not request this, ignore this email. Your password has not changed.`,
        );
      }
      return NextResponse.json({
        message:
          'If an account exists, a reset link has been sent. In email preview mode, the store administrator can inspect the local outbox.',
      });
    }
    if (action === 'reset') {
      const { token, password } = z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(128) })
        .parse(body);
      const passwordHash = await hash(password, 12);
      const record = await tokens.findOneAndDelete({
        _id: digest(token),
        expiresAt: { $gt: new Date() },
      });
      if (!record)
        throw new HttpError(
          400,
          'This reset link has expired or was already used. Request another link.',
        );
      await users.updateOne(
        { _id: record.userId },
        { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
      );
      await tokens.deleteMany({ userId: record.userId });
      return NextResponse.json({
        message: 'Password updated. Please sign in again on all devices.',
      });
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    return fail(e);
  }
}
