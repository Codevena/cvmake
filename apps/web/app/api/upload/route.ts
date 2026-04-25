import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { photoDir, uploadStagingDir, validateSlug } from '@/lib/data-paths';
import { processPhoto } from '@codevena/forq-core/photo';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
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
