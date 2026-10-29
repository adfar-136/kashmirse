import { NextResponse } from 'next/server';
import { db } from '@/shared/lib/db';
export async function GET() {
  try {
    await (await db()).command({ ping: 1 });
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch {
    return NextResponse.json({ status: 'unavailable', database: 'disconnected' }, { status: 503 });
  }
}
