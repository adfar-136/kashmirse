import { NextResponse } from 'next/server';
import { getProducts, getCategories } from '@/entities/product/model/queries';
import { fail } from '@/shared/lib/http';
export async function GET() {
  try {
    return NextResponse.json({ products: await getProducts(), categories: await getCategories() });
  } catch (e) {
    return fail(e);
  }
}
