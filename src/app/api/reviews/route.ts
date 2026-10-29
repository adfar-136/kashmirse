import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { collection } from '@/shared/lib/db';
import { requireUser, assertOrigin, HttpError } from '@/shared/lib/auth';
import { fail, jsonBody } from '@/shared/lib/http';
import type { Review, Order, Product } from '@/shared/lib/types';
export async function POST(req: Request) {
  try {
    await assertOrigin();
    const u = await requireUser();
    const data = z
      .object({
        productId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        title: z.string().trim().min(3).max(100),
        body: z.string().trim().min(10).max(2000),
      })
      .parse(await jsonBody(req));
    const delivered = await (
      await collection<Order>('orders')
    ).findOne({ userId: u._id, status: 'delivered', 'items.productId': data.productId });
    if (!delivered) throw new HttpError(403, 'Reviews are available after a delivered purchase.');
    const reviews = await collection<Review>('reviews');
    const review = {
      _id: randomUUID(),
      ...data,
      userId: u._id,
      name: u.name,
      approved: false,
      verified: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await reviews.insertOne(review);
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw new HttpError(409, 'You have already reviewed this product.');
      throw e;
    }
    return NextResponse.json({ message: 'Thank you. Your review is awaiting moderation.' });
  } catch (e) {
    return fail(e);
  }
}
