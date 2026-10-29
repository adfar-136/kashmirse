import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { randomUUID, createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { collection } from '@/shared/lib/db';
import {
  session,
  setSession,
  clearSession,
  assertOrigin,
  publicUser,
  HttpError,
} from '@/shared/lib/auth';
import { authSchema } from '@/shared/lib/validation';
import { fail, jsonBody } from '@/shared/lib/http';
import type { User } from '@/shared/lib/types';
export async function GET() {
  return NextResponse.json({ user: await session() });
}
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  try {
    await assertOrigin();
    const { action } = await ctx.params;
    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ ok: true });
    }
    if (!['login', 'register'].includes(action)) throw new HttpError(404, 'Not found');
    const input = authSchema.parse(await jsonBody(req));
    const users = await collection<User>('users');
    const ip = (await headers()).get('x-forwarded-for') || 'local';
    const key = createHash('sha256')
      .update(ip + input.email)
      .digest('hex');
    const attempts = await collection<{ _id: string; count: number; expiresAt: Date }>(
      'auth_attempts',
    );
    const lock = await attempts.findOne({ _id: key });
    if (lock && lock.expiresAt > new Date() && lock.count >= 10)
      throw new HttpError(429, 'Too many attempts. Please wait 15 minutes.');
    let user: User | null;
    if (action === 'register') {
      if (!input.name) throw new HttpError(400, 'Please enter your name');
      if (await users.findOne({ email: input.email }))
        throw new HttpError(409, 'An account with this email already exists.');
      user = {
        _id: randomUUID(),
        name: input.name,
        email: input.email,
        passwordHash: await hash(input.password, 12),
        role: 'customer',
        wishlist: [],
        addresses: [],
        createdAt: new Date().toISOString(),
      };
      await users.insertOne(user);
    } else {
      user = await users.findOne({ email: input.email });
      if (!user || !(await compare(input.password, user.passwordHash))) {
        await attempts.updateOne(
          { _id: key },
          { $inc: { count: 1 }, $set: { expiresAt: new Date(Date.now() + 900000) } },
          { upsert: true },
        );
        throw new HttpError(401, 'Email or password is incorrect.');
      }
    }
    await attempts.deleteOne({ _id: key });
    await setSession(user);
    return NextResponse.json({ user: publicUser(user) });
  } catch (e) {
    return fail(e);
  }
}
