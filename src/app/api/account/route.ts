import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { collection } from '@/shared/lib/db';
import { requireUser, assertOrigin, publicUser } from '@/shared/lib/auth';
import { addressSchema } from '@/shared/lib/validation';
import { fail, jsonBody } from '@/shared/lib/http';
import type { User } from '@/shared/lib/types';
export async function GET() {
  try {
    return NextResponse.json({ user: await requireUser() });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(req: Request) {
  try {
    await assertOrigin();
    const u = await requireUser();
    const input = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        addresses: z
          .array(addressSchema.extend({ id: z.string().optional() }))
          .max(10)
          .optional(),
        wishlist: z.array(z.string().max(100)).max(200).optional(),
      })
      .parse(await jsonBody(req));
    if (input.addresses)
      input.addresses = input.addresses.map((a) => ({ ...a, id: a.id || randomUUID() }));
    const user = await (
      await collection<User>('users')
    ).findOneAndUpdate({ _id: u._id }, { $set: input }, { returnDocument: 'after' });
    return NextResponse.json({ user: publicUser(user!) });
  } catch (e) {
    return fail(e);
  }
}
