import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireAdmin, assertOrigin, HttpError } from '@/shared/lib/auth';
import { fail } from '@/shared/lib/http';
export async function POST(req: Request) {
  try {
    await assertOrigin();
    await requireAdmin();
    if (Number(req.headers.get('content-length')) > 6 * 1024 * 1024)
      throw new HttpError(413, 'Maximum upload size is 5 MB.');
    const form = await req.formData();
    const f = form.get('file');
    if (!(f instanceof File) || f.size > 5 * 1024 * 1024 || f.size === 0)
      throw new HttpError(400, 'Choose an image up to 5 MB.');
    const bytes = Buffer.from(await f.arrayBuffer());
    let ext = '';
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ext = 'png';
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ext = 'jpg';
    else if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
      ext = 'webp';
    if (!ext) throw new HttpError(400, 'Only PNG, JPEG and WebP images are accepted.');
    const name = randomUUID() + '.' + ext;
    const dir = join(process.cwd(), '.data', 'uploads');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), bytes, { flag: 'wx' });
    return NextResponse.json({ path: '/uploads/' + name });
  } catch (e) {
    return fail(e);
  }
}
