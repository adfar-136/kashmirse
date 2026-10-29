import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { collection, db } from '@/shared/lib/db';
import { requireAdmin, assertOrigin, HttpError } from '@/shared/lib/auth';
import { productSchema } from '@/shared/lib/validation';
import { fail, jsonBody } from '@/shared/lib/http';
import type { Product, Order, User, Review } from '@/shared/lib/types';
export async function GET(_: Request, ctx: { params: Promise<{ resource: string }> }) {
  try {
    await requireAdmin();
    const { resource } = await ctx.params;
    const database = await db();
    if (resource === 'overview') {
      const [orders, products, users, enquiries] = await Promise.all([
        database.collection<Order>('orders').find({}).sort({ createdAt: -1 }).toArray(),
        database.collection<Product>('products').find({}).toArray(),
        database
          .collection<User>('users')
          .find({}, { projection: { passwordHash: 0 } })
          .toArray(),
        database.collection('enquiries').find({}).sort({ createdAt: -1 }).toArray(),
      ]);
      return NextResponse.json({ orders, products, users, enquiries });
    }
    const allowed = [
      'products',
      'orders',
      'users',
      'categories',
      'coupons',
      'reviews',
      'enquiries',
      'settings',
    ];
    if (!allowed.includes(resource)) throw new HttpError(404, 'Not found');
    const items = await database
      .collection(resource)
      .find({}, { projection: resource === 'users' ? { passwordHash: 0 } : {} })
      .toArray();
    return NextResponse.json({ items });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request, ctx: { params: Promise<{ resource: string }> }) {
  try {
    await assertOrigin();
    await requireAdmin();
    const { resource } = await ctx.params;
    const data = await jsonBody(req);
    const database = await db();
    if (resource === 'products') {
      const input = productSchema.parse(data);
      if (!(await database.collection('categories').findOne({ _id: input.category as never })))
        throw new HttpError(400, 'Choose an existing category');
      const id = randomUUID();
      const slug =
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        id.slice(0, 6);
      const item: Product = {
        ...input,
        _id: id,
        slug,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };
      await (await collection<Product>('products')).insertOne(item);
      return NextResponse.json({ item });
    }
    if (resource === 'coupons') {
      const input = couponSchema.parse(data);
      await database.collection('coupons').insertOne({ ...input, _id: randomUUID() as never });
      return NextResponse.json({ ok: true });
    }
    throw new HttpError(404, 'Not found');
  } catch (e) {
    return fail(e);
  }
}
const couponSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9]{3,30}$/),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().min(1).max(10000),
    minOrder: z.number().int().min(0),
    maxDiscount: z.number().int().min(1),
    active: z.boolean(),
    expiresAt: z.iso.datetime(),
  })
  .refine((c) => c.type !== 'percent' || c.value <= 100, 'Percentage cannot exceed 100');
export async function PATCH(req: Request, ctx: { params: Promise<{ resource: string }> }) {
  try {
    await assertOrigin();
    await requireAdmin();
    const { resource } = await ctx.params;
    const data = await jsonBody(req);
    const { id, ...rest } = data;
    if (typeof id !== 'string') throw new HttpError(400, 'Record ID required');
    const database = await db();
    let changes: Record<string, unknown>;
    if (resource === 'products') {
      changes = productSchema.parse(rest);
      if (!(await database.collection('categories').findOne({ _id: changes.category as never })))
        throw new HttpError(400, 'Choose an existing category');
    } else if (resource === 'categories') {
      changes = z
        .object({ name: z.string().min(2).max(80), description: z.string().max(500) })
        .parse(rest);
    } else if (resource === 'coupons') {
      changes = couponSchema.parse(rest);
    } else if (resource === 'enquiries') {
      changes = z.object({ status: z.enum(['new', 'in-progress', 'resolved']) }).parse(rest);
    } else if (resource === 'reviews') {
      changes = z.object({ approved: z.boolean() }).parse(rest);
    } else if (resource === 'settings') {
      changes = z
        .object({
          storeName: z.string().min(2).max(80),
          supportEmail: z.email(),
          phone: z.string().max(30),
          freeShippingAt: z.number().int().min(0).max(100000),
          shippingFee: z.number().int().min(0).max(10000),
          codEnabled: z.boolean(),
          announcement: z.string().max(200),
        })
        .parse(rest);
    } else throw new HttpError(404, 'Not found');
    const result = await database
      .collection(resource)
      .updateOne({ _id: id as never }, { $set: changes });
    if (!result.matchedCount) throw new HttpError(404, 'Record not found');
    if (resource === 'reviews') {
      const review = await (await collection<Review>('reviews')).findOne({ _id: id });
      if (review) {
        const all = await (
          await collection<Review>('reviews')
        )
          .find({ productId: review.productId, approved: true })
          .toArray();
        await (
          await collection<Product>('products')
        ).updateOne(
          { _id: review.productId },
          {
            $set: {
              reviewCount: all.length,
              rating: all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0,
            },
          },
        );
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
