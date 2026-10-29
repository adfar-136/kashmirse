import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, assertOrigin } from '@/shared/lib/auth';
import { collection } from '@/shared/lib/db';
import { fail, jsonBody } from '@/shared/lib/http';
import { deliverMail, type Mail } from '@/shared/lib/notifications';
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      mode: process.env.EMAIL_MODE === 'smtp' ? 'smtp' : 'preview',
      mails: await (
        await collection<Mail>('mail_outbox')
      )
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    await assertOrigin();
    await requireAdmin();
    const { id } = z.object({ id: z.string().uuid() }).parse(await jsonBody(req));
    await deliverMail(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
