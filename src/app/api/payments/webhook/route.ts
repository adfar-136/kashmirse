import { NextResponse } from 'next/server';
import { validSignature, settlePayment, razorpay } from '@/shared/lib/payments';
import { collection } from '@/shared/lib/db';
import { fail } from '@/shared/lib/http';
import { HttpError } from '@/shared/lib/auth';
import type { Order } from '@/shared/lib/types';
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (
      process.env.PAYMENT_MODE !== 'razorpay' ||
      !secret ||
      !validSignature(raw, req.headers.get('x-razorpay-signature') || '', secret)
    )
      throw new HttpError(400, 'Invalid webhook signature');
    const event = JSON.parse(raw);
    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity;
      const order = await (
        await collection<Order>('orders')
      ).findOne({ providerOrderId: entity?.order_id });
      if (order) {
        const p = await razorpay('payments/' + encodeURIComponent(entity.id));
        if (
          p.status !== 'captured' ||
          p.amount !== order.total * 100 ||
          p.currency !== 'INR' ||
          p.order_id !== order.providerOrderId
        )
          throw new HttpError(400, 'Payment mismatch');
        await settlePayment(order, p.id);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
