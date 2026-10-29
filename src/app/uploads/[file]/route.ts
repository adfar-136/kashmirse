import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(file)) {
    return new NextResponse('Not found', { status: 404 });
  }
  try {
    const bytes = await readFile(join(process.cwd(), '.data', 'uploads', file));
    const extension = file.split('.').pop();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
