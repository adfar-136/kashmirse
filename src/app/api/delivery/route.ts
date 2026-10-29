import { NextResponse } from 'next/server';
import { requireUser } from '@/shared/lib/auth';
import { fail } from '@/shared/lib/http';
import { deliveryQuote } from '@/shared/lib/delivery';
export async function GET(req: Request) {
  try {
    await requireUser();
    const p = new URL(req.url).searchParams;
    return NextResponse.json(await deliveryQuote(p.get('pincode') || '', p.get('cod') === '1'));
  } catch (e) {
    return fail(e);
  }
}
