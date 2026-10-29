import { deliveryQuote } from '@/shared/lib/delivery';
import { notifyOrder } from '@/shared/lib/notifications';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { collection } from '@/shared/lib/db';
import { requireUser, orderIdentity, assertOrigin, HttpError } from '@/shared/lib/auth';
import { saveCheckoutAddress } from '@/features/checkout/save-address';
import { sameAddress } from '@/shared/lib/addresses';
import { checkoutSchema } from '@/shared/lib/validation';
import { fail, jsonBody } from '@/shared/lib/http';
import { totals, normalizeLines } from '@/shared/lib/commerce';
import { getSettings } from '@/entities/product/model/queries';
import type { Order, Product, Coupon, OrderItem } from '@/shared/lib/types';
export async function GET() {
  try {
    const user = await orderIdentity();
    if (!user) throw new HttpError(401, 'Please sign in to view orders.');
    return NextResponse.json({
      orders: await (
        await collection<Order>('orders')
      )
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .toArray(),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    await assertOrigin();
    const customer = await requireUser();
    const input = checkoutSchema.parse(await jsonBody(req));
    if (input.addressId && !customer.addresses.some((a) => a.id === input.addressId))
      throw new HttpError(400, 'Choose one of your saved addresses or add a new one.');
    if (
      input.saveAddress &&
      !input.addressId &&
      customer.addresses.length >= 10 &&
      !customer.addresses.some((a) => sameAddress(a, input.address))
    )
      throw new HttpError(
        400,
        'You can save up to 10 addresses. Remove one or use this address without saving.',
      );
    const persistAddress = async () => {
      if (input.saveAddress)
        await saveCheckoutAddress(
          customer._id,
          input.address,
          input.idempotencyKey,
          input.addressId,
        );
    };
    const orders = await collection<Order>('orders');
    const existing = await orders.findOne({
      idempotencyKey: input.idempotencyKey,
      userId: customer._id,
    });
    if (existing) {
      await persistAddress();
      return NextResponse.json({ order: existing });
    }
    if (input.paymentMethod === 'demo' && process.env.PAYMENT_MODE === 'razorpay')
      throw new HttpError(
        400,
        'Demo checkout is disabled. Choose an online payment method or COD.',
      );
    const settings = await getSettings();
    if (input.paymentMethod === 'cod' && !settings.codEnabled)
      throw new HttpError(400, 'Cash on delivery is currently unavailable.');
    const quote = await deliveryQuote(input.address.pincode, input.paymentMethod === 'cod');
    if (!quote.serviceable || (input.paymentMethod === 'cod' && !quote.codAvailable))
      throw new HttpError(400, 'Delivery or COD is unavailable at this postcode.');
    const products = await collection<Product>('products');
    const items: OrderItem[] = [];
    for (const line of normalizeLines(input.items)) {
      const p = await products.findOne({ _id: line.productId, active: true });
      const v = p?.variants.find((v) => v.id === line.variantId);
      if (!p || !v || v.stock < line.quantity)
        throw new HttpError(
          409,
          'An item is unavailable or has insufficient stock. Please review your bag.',
        );
      items.push({
        ...line,
        name: p.name,
        variantLabel: v.label,
        price: v.price,
        image: p.image,
        slug: p.slug,
      });
    }
    let coupon: Coupon | null = null;
    if (input.coupon) {
      coupon = await (
        await collection<Coupon>('coupons')
      ).findOne({ code: input.coupon.toUpperCase(), active: true });
      if (
        !coupon ||
        Date.parse(coupon.expiresAt) <= Date.now() ||
        items.reduce((s, i) => s + i.price * i.quantity, 0) < coupon.minOrder
      )
        throw new HttpError(400, 'This offer is not available for your order.');
    }
    const amounts = totals(
      items.reduce((s, i) => s + i.price * i.quantity, 0),
      coupon,
      settings,
    );
    const at = new Date().toISOString();
    const order: Order = {
      _id:
        'KS-' +
        Date.now().toString(36).toUpperCase() +
        '-' +
        randomUUID().slice(0, 4).toUpperCase(),
      userId: customer._id,
      email: customer.email,
      items,
      address: input.address,
      ...amounts,
      coupon: coupon?.code || '',
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'demo' ? 'demo — no money charged' : 'pending',
      status: 'confirmed',
      history: [{ status: 'confirmed', note: 'Order received by Kashmir Se', at }],
      tracking: '',
      createdAt: at,
      idempotencyKey: input.idempotencyKey,
    };
    const reserved: OrderItem[] = [];
    try {
      for (const item of items) {
        const result = await products.updateOne(
          {
            _id: item.productId,
            active: true,
            variants: { $elemMatch: { id: item.variantId, stock: { $gte: item.quantity } } },
          },
          { $inc: { 'variants.$.stock': -item.quantity } },
        );
        if (result.modifiedCount !== 1)
          throw new HttpError(409, 'Stock just changed. Please review your bag and try again.');
        reserved.push(item);
      }
      await orders.insertOne(order);
    } catch (error) {
      for (const item of reserved)
        await products.updateOne(
          { _id: item.productId, 'variants.id': item.variantId },
          { $inc: { 'variants.$.stock': item.quantity } },
        );
      if ((error as { code?: number }).code === 11000) {
        const found = await orders.findOne({
          idempotencyKey: input.idempotencyKey,
          userId: customer._id,
        });
        if (found) {
          await persistAddress();
          return NextResponse.json({ order: found });
        }
      }
      throw error;
    }
    await persistAddress();
    await notifyOrder(
      order,
      ['upi', 'card'].includes(order.paymentMethod) ? 'awaiting payment' : 'order received',
    );
    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
