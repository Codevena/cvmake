import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { photoDir, uploadStagingDir, validateSlug } from '@/lib/data-paths';
import { processPhoto } from '@codevena/cvmake-core/photo';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: Request): Promise<NextResponse> {
  // Reject oversize bodies before parsing the multipart form. Content-Length
  // can be missing or spoofed — the post-parse `file.size` check below catches
  // both cases — but pre-checking the declared length avoids buffering an
  // attacker-controlled multipart payload into memory when the header is
  // honest. Defense in depth, not a hard guarantee.
  const declaredLength = req.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ kind: 'too_large', maxBytes: MAX_UPLOAD_BYTES }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ kind: 'bad_multipart' }, { status: 400 });
  }
  const file = form.get('file');
  const slugRaw = form.get('slug');
  const cropRaw = form.get('crop');
  const aspect = form.get('aspect');
  if (
    !(file instanceof Blob) ||
    typeof slugRaw !== 'string' ||
    typeof cropRaw !== 'string' ||
    typeof aspect !== 'string'
  ) {
    return NextResponse.json({ kind: 'bad_request' }, { status: 400 });
  }
  let slug: string;
  try {
    slug = validateSlug(slugRaw);
  } catch {
    return NextResponse.json({ kind: 'invalid_slug' }, { status: 400 });
  }
  let crop: { x: number; y: number; width: number; height: number };
  try {
    crop = JSON.parse(cropRaw);
  } catch {
    return NextResponse.json({ kind: 'bad_crop' }, { status: 400 });
  }
  // Reject by declared MIME type before reading the body — Sharp is hardened
  // but the narrower the surface, the better.
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json(
      { kind: 'unsupported_type', allowed: [...ALLOWED_UPLOAD_TYPES] },
      { status: 415 },
    );
  }
  // Reject oversize uploads BEFORE buffering the body into memory. Blob has a
  // synchronous `size` property, so we can short-circuit here and avoid loading
  // multi-megabyte payloads into a Buffer just to throw them away.
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ kind: 'too_large', maxBytes: MAX_UPLOAD_BYTES }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  await mkdir(photoDir(), { recursive: true });
  await mkdir(uploadStagingDir(), { recursive: true });
  const tmp = path.join(uploadStagingDir(), `.upload-${slug}-${Date.now()}.bin`);
  await writeFile(tmp, buf);
  try {
    const result = await processPhoto({
      inputPath: tmp,
      outputDir: photoDir(),
      slug,
      crop: { left: crop.x, top: crop.y, width: crop.width, height: crop.height },
    });
    return NextResponse.json({
      webp: `/photos/${slug}.webp`,
      jpg: `/photos/${slug}.jpg`,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    return NextResponse.json({ kind: 'process_failed', message: String(err) }, { status: 400 });
  } finally {
    await rm(tmp, { force: true });
  }
}
