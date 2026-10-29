import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';
export function fail(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues.map((i) => i.message).join('. ') },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(error);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
export async function jsonBody(request: Request) {
  if (Number(request.headers.get('content-length')) > 1000000)
    throw new HttpError(413, 'Request too large');
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Invalid request body');
  }
}
