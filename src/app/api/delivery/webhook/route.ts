import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { collection } from '@/shared/lib/db';
import { fail, jsonBody } from '@/shared/lib/http';
import { HttpError } from '@/shared/lib/auth';
import { syncShipment } from '@/shared/lib/delivery';
import type { Order } from '@/shared/lib/types';
export async function POST(req: Request) {
  try {
    const secret = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    const digest = (s: string) => createHash('sha256').update(s).digest();
    if (
      process.env.DELIVERY_MODE !== 'shiprocket' ||
      !secret ||
      !timingSafeEqual(digest(secret), digest(req.headers.get('x-api-key') || ''))
    )
      throw new HttpError(401, 'Invalid courier webhook token');
    const body = z.object({ awb: z.string().min(1).max(100) }).parse(await jsonBody(req));
    const order = await (
      await collection<Order>('orders')
    ).findOne({ 'shipment.mode': 'shiprocket', 'shipment.awb': body.awb });
    if (order) await syncShipment(order._id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
