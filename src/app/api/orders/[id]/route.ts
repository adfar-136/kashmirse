import { notifyOrder } from '@/shared/lib/notifications';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { collection } from '@/shared/lib/db';
import { orderIdentity, assertOrigin, HttpError } from '@/shared/lib/auth';
import { canTransition } from '@/shared/lib/commerce';
import { fail, jsonBody } from '@/shared/lib/http';
import type { Order, Product, OrderStatus } from '@/shared/lib/types';
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await orderIdentity();
    if (!u) throw new HttpError(401, 'Please sign in to view this order.');
    const { id } = await ctx.params;
    const order = await (
      await collection<Order>('orders')
    ).findOne({ _id: id, ...(u.role === 'admin' ? {} : { userId: u._id }) });
    if (!order) throw new HttpError(404, 'Order not found');
    return NextResponse.json({ order });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await assertOrigin();
    const u = await orderIdentity();
    if (!u) throw new HttpError(401, 'Please sign in to view this order.');
    const { id } = await ctx.params;
    const input = z
      .object({
        status: z.enum(['processing', 'shipped', 'delivered', 'cancelled']).optional(),
        tracking: z.string().max(100).optional(),
        returnReason: z.string().trim().min(10).max(1000).optional(),
        returnStatus: z.enum(['approved', 'declined', 'refunded']).optional(),
      })
      .parse(await jsonBody(req));
    const orders = await collection<Order>('orders');
    const filter = { _id: id, ...(u.role === 'admin' ? {} : { userId: u._id }) };
    const order = await orders.findOne(filter);
    if (!order) throw new HttpError(404, 'Order not found');
    const at = new Date().toISOString();
    if (input.returnReason) {
      if (order.status !== 'delivered' || order.returnRequest)
        throw new HttpError(409, 'A return cannot be requested for this order.');
      if (
        Date.now() -
          Date.parse(
            order.history.findLast((h) => h.status === 'delivered')?.at || order.createdAt,
          ) >
        7 * 86400000
      )
        throw new HttpError(400, 'The 7-day request window has passed. Please contact support.');
      const result = await orders.updateOne(
        { ...filter, returnRequest: { $exists: false } },
        { $set: { returnRequest: { reason: input.returnReason, at, status: 'requested' } } },
      );
      if (!result.modifiedCount) throw new HttpError(409, 'A request already exists.');
    } else if (input.returnStatus) {
      if (u.role !== 'admin' || !order.returnRequest)
        throw new HttpError(403, 'Administrator access required.');
      const allowed: Record<string, string[]> = {
        requested: ['approved', 'declined'],
        approved: ['refunded'],
        declined: [],
        refunded: [],
      };
      if (!allowed[order.returnRequest.status]?.includes(input.returnStatus))
        throw new HttpError(409, 'This return transition is not available.');
      await orders.updateOne(
        { ...filter, 'returnRequest.status': order.returnRequest.status },
        {
          $set: {
            'returnRequest.status': input.returnStatus,
            ...(input.returnStatus === 'refunded'
              ? { paymentStatus: 'refund recorded — manual settlement required' }
              : {}),
          },
          $push: {
            history: {
              status: 'return-' + input.returnStatus,
              note: 'Return request ' + input.returnStatus,
              at,
            },
          },
        },
      );
    } else if (input.status) {
      if (u.role !== 'admin' && input.status !== 'cancelled')
        throw new HttpError(403, 'Only administrators can update fulfilment.');
      if (
        input.status !== 'cancelled' &&
        ['upi', 'card'].includes(order.paymentMethod) &&
        !['paid', 'simulated paid — no money charged'].includes(order.paymentStatus)
      )
        throw new HttpError(409, 'Payment must be verified before fulfilment.');
      if (
        input.status === 'cancelled' &&
        order.shipment?.mode === 'shiprocket' &&
        order.shipment.status !== 'cancelled'
      )
        throw new HttpError(
          409,
          'Cancel the courier booking in Shiprocket before cancelling this order.',
        );
      if (
        input.status === 'cancelled' &&
        (await orders.findOne({ _id: id, shipmentBooking: true }))
      )
        throw new HttpError(409, 'Wait for shipment booking to finish before cancelling.');
      if (!canTransition(order.status, input.status))
        throw new HttpError(409, 'This order can no longer be changed in that way.');
      const result = await orders.updateOne(
        { ...filter, status: order.status },
        {
          $set: {
            status: input.status as OrderStatus,
            ...(input.status === 'cancelled' && order.paymentStatus === 'paid'
              ? { paymentStatus: 'refund pending — manual provider refund required' }
              : {}),
            ...(input.status === 'shipped' ? { tracking: input.tracking || '' } : {}),
          },
          $push: {
            history: {
              status: input.status,
              note:
                input.status === 'shipped'
                  ? 'Dispatched' + (input.tracking ? ' · ' + input.tracking : '')
                  : 'Order ' + input.status,
              at,
            },
          },
        },
      );
      if (!result.modifiedCount) throw new HttpError(409, 'Order changed. Please reload.');
      if (input.status === 'cancelled') {
        for (const item of order.items)
          await (
            await collection<Product>('products')
          ).updateOne(
            { _id: item.productId, 'variants.id': item.variantId },
            { $inc: { 'variants.$.stock': item.quantity } },
          );
      }
    } else throw new HttpError(400, 'Choose an action.');
    const fresh = await orders.findOne(filter);
    if (fresh)
      await notifyOrder(
        fresh,
        input.returnStatus
          ? 'return ' + input.returnStatus
          : input.returnReason
            ? 'return requested'
            : fresh.status,
      );
    return NextResponse.json({ order: fresh });
  } catch (e) {
    return fail(e);
  }
}
