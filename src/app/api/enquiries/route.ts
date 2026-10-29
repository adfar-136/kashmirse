import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { collection } from '@/shared/lib/db';
import { assertOrigin, HttpError, session } from '@/shared/lib/auth';
import { fail, jsonBody } from '@/shared/lib/http';
export async function POST(req: Request) {
  try {
    await assertOrigin();
    const u = await session();
    const input = z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.email().max(200),
        type: z.enum(['support', 'bulk', 'custom', 'stock']),
        subject: z.string().trim().min(3).max(200),
        message: z.string().trim().min(10).max(5000),
      })
      .parse(await jsonBody(req));
    const enquiries = await collection<{
      _id: string;
      email: string;
      createdAt: string;
      status: string;
      name: string;
      type: string;
      subject: string;
      message: string;
      userId?: string;
    }>('enquiries');
    const recent = await enquiries.countDocuments({
      email: input.email,
      createdAt: { $gt: new Date(Date.now() - 3600000).toISOString() },
    });
    if (recent >= 5) throw new HttpError(429, 'Please wait before sending another message.');
    await enquiries.insertOne({
      _id: randomUUID(),
      ...input,
      userId: u?._id,
      status: 'new',
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({
      message: 'Your message is saved. The store team can respond from their support workflow.',
    });
  } catch (e) {
    return fail(e);
  }
}
