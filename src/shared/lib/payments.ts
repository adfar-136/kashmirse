import { createHmac, timingSafeEqual } from 'node:crypto';
import { collection } from './db';
import { HttpError } from './auth';
import { notifyOrder } from './notifications';
import type { Order } from './types';
export const paymentMode = () =>
  process.env.PAYMENT_MODE === 'razorpay' ? 'razorpay' : 'simulation';
export function validSignature(value: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(value).digest('hex');
  return (
    /^[a-f0-9]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}
export async function razorpay(path: string, body?: unknown) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw new HttpError(503, 'Razorpay credentials have not been configured.');
  const response = await fetch('https://api.razorpay.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString(
          'base64',
        ),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpError(502, 'Payment provider could not complete this request. Please retry.');
  return response.json();
}
export async function settlePayment(order: Order, paymentId: string, simulated = false) {
  const orders = await collection<Order>('orders');
  await orders.updateOne(
    {
      _id: order._id,
      status: { $ne: 'cancelled' },
      paymentStatus: { $nin: ['paid', 'simulated paid — no money charged'] },
    },
    {
      $set: { paymentStatus: simulated ? 'simulated paid — no money charged' : 'paid', paymentId },
      $push: {
        history: {
          status: 'payment',
          note: simulated
            ? 'Simulated payment completed — no money charged'
            : 'Payment captured and verified',
          at: new Date().toISOString(),
        },
      },
    },
  );
  const fresh = await orders.findOne({ _id: order._id });
  if (fresh?.status === 'cancelled' && !simulated) {
    await orders.updateOne(
      { _id: order._id, status: 'cancelled' },
      {
        $set: { paymentId, paymentStatus: 'refund pending — payment captured after cancellation' },
      },
    );
    const cancelled = await orders.findOne({ _id: order._id });
    if (cancelled)
      await notifyOrder(cancelled, 'payment received after cancellation — refund required');
    return cancelled;
  }
  if (fresh) await notifyOrder(fresh, 'payment confirmed');
  return fresh;
}
