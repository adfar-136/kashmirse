import { NextResponse } from 'next/server';
import { collection } from '@/shared/lib/db';
import { z } from 'zod';
import { assertOrigin, HttpError } from '@/shared/lib/auth';
import { fail, jsonBody } from '@/shared/lib/http';
import type { Coupon } from '@/shared/lib/types';
export async function POST(req: Request) {
  try {
    await assertOrigin();
    const input = z
      .object({ code: z.string().max(40), subtotal: z.number().min(0) })
      .parse(await jsonBody(req));
    const coupon = await (
      await collection<Coupon>('coupons')
    ).findOne({ code: input.code.toUpperCase(), active: true });
    if (!coupon || Date.parse(coupon.expiresAt) <= Date.now())
      throw new HttpError(400, 'Offer code is invalid or expired.');
    if (input.subtotal < coupon.minOrder)
      throw new HttpError(400, `This offer needs a minimum order of ₹${coupon.minOrder}.`);
    return NextResponse.json({ coupon });
  } catch (e) {
    return fail(e);
  }
}
