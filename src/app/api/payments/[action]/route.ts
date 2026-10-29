import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertOrigin, requireUser, HttpError } from '@/shared/lib/auth';
import { collection } from '@/shared/lib/db';
import { fail, jsonBody } from '@/shared/lib/http';
import { paymentMode, razorpay, validSignature, settlePayment } from '@/shared/lib/payments';
import type { Order } from '@/shared/lib/types';
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  try {
    await assertOrigin();
    const user = await requireUser();
    const { action } = await ctx.params;
    const data = z
      .object({
        orderId: z.string().max(100),
        outcome: z.enum(['success', 'failed', 'cancelled']).optional(),
        razorpay_payment_id: z.string().max(100).optional(),
        razorpay_signature: z.string().max(200).optional(),
      })
      .parse(await jsonBody(req));
    const orders = await collection<Order>('orders');
    const order = await orders.findOne({ _id: data.orderId, userId: user._id });
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.status === 'cancelled' || !['upi', 'card'].includes(order.paymentMethod))
      throw new HttpError(409, 'This order is not available for online payment.');
    if (['paid', 'simulated paid — no money charged'].includes(order.paymentStatus))
      return NextResponse.json({ paid: true, order });
    if (action === 'start') {
      if (paymentMode() === 'simulation')
        return NextResponse.json({
          mode: 'simulation',
          amount: order.total * 100,
          orderId: order._id,
        });
      let providerOrderId = order.providerOrderId;
      if (!providerOrderId) {
        const p = await razorpay('orders', {
          amount: order.total * 100,
          currency: 'INR',
          receipt: order._id,
        });
        providerOrderId = p.id;
        const saved = await orders.findOneAndUpdate(
          { _id: order._id, providerOrderId: { $exists: false } },
          { $set: { providerOrderId } },
          { returnDocument: 'after' },
        );
        if (!saved) providerOrderId = (await orders.findOne({ _id: order._id }))?.providerOrderId;
      }
      return NextResponse.json({
        mode: 'razorpay',
        key: process.env.RAZORPAY_KEY_ID,
        providerOrderId,
        amount: order.total * 100,
      });
    }
    if (action === 'simulate') {
      if (paymentMode() !== 'simulation' || order.providerOrderId)
        throw new HttpError(403, 'Simulation is disabled for this payment.');
      if (!data.outcome) throw new HttpError(400, 'Choose a test result');
      if (data.outcome === 'success')
        return NextResponse.json({ order: await settlePayment(order, 'SIM-' + order._id, true) });
      await orders.updateOne(
        { _id: order._id, paymentStatus: { $nin: ['paid', 'simulated paid — no money charged'] } },
        { $set: { paymentStatus: 'simulation ' + data.outcome } },
      );
      return NextResponse.json({ outcome: data.outcome });
    }
    if (action === 'verify') {
      if (
        paymentMode() !== 'razorpay' ||
        !order.providerOrderId ||
        !data.razorpay_payment_id ||
        !validSignature(
          order.providerOrderId + '|' + data.razorpay_payment_id,
          data.razorpay_signature || '',
          process.env.RAZORPAY_KEY_SECRET || '',
        )
      )
        throw new HttpError(400, 'Payment verification failed.');
      const p = await razorpay('payments/' + encodeURIComponent(data.razorpay_payment_id));
      if (
        p.order_id !== order.providerOrderId ||
        p.amount !== order.total * 100 ||
        p.currency !== 'INR' ||
        p.status !== 'captured'
      )
        throw new HttpError(409, 'Payment has not been captured yet. Retry verification shortly.');
      return NextResponse.json({ order: await settlePayment(order, p.id) });
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    return fail(e);
  }
}
