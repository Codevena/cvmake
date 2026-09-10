import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { atomicWriteFile } from './atomic-write.js';

export interface ProcessPhotoOptions {
  inputPath: string;
  outputDir: string;
  slug: string;
  maxBytes?: number | undefined;
  targetSize?: number | undefined;
  crop?: { left: number; top: number; width: number; height: number } | undefined;
}

export interface ProcessedPhoto {
  webp: string;
  jpg: string;
  width: number;
  height: number;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TARGET = 600;
const SLUG_RE = /^(?!\.+$)[a-z0-9.-]+$/;
// Cap the DECODED pixel count so a small, highly-compressed "decompression
// bomb" cannot force Sharp to allocate gigabytes. ~50 MP still covers any
// realistic DSLR/phone photo. Sharp throws if the source exceeds this.
const MAX_INPUT_PIXELS = 50_000_000;

export async function processPhoto(opts: ProcessPhotoOptions): Promise<ProcessedPhoto> {
  const {
    inputPath,
    outputDir,
    slug,
    maxBytes = DEFAULT_MAX_BYTES,
    targetSize = DEFAULT_TARGET,
  } = opts;
  if (!SLUG_RE.test(slug)) throw new Error(`invalid slug: ${slug}`);

  const info = await stat(inputPath);
  if (info.size > maxBytes) {
    throw new Error(`photo too large: ${info.size} > ${maxBytes}`);
  }

  const buffer = await readFile(inputPath);
  let pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  // Set when a crop was applied: the output size that preserves its ratio.
  // Without a crop the square default stands, which is what every existing
  // caller relies on.
  let cropTarget: { width: number; height: number } | undefined;
  if (opts.crop) {
    // After EXIF rotation, width/height may be swapped (90°/270° orientations).
    // Re-fetch post-rotate dimensions so we can give a clear error before sharp's
    // generic "bad extract area" fires.
    const rotMeta = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).rotate().metadata();
    const imgW = rotMeta.width ?? 0;
    const imgH = rotMeta.height ?? 0;
    const left = Math.round(opts.crop.left);
    const top = Math.round(opts.crop.top);
    const width = Math.round(opts.crop.width);
    const height = Math.round(opts.crop.height);
    if (left < 0 || top < 0 || left + width > imgW || top + height > imgH) {
      throw new Error(
        `crop out of bounds: [${left},${top}]+${width}×${height} exceeds ${imgW}×${imgH} post-rotate`,
      );
    }
    pipeline = pipeline.extract({ left, top, width, height });
    // Keep the aspect ratio the user actually dragged. The old code resized
    // every crop to a square, so a 3:4 selection was extracted correctly and
    // then squashed — and `position: 'attention'` picked a NEW region inside
    // the frame the user had just chosen, overriding their framing.
    //
    // `targetSize` is the long edge, matching what a square crop produced
    // before: a 100x100 crop still yields 600x600, a 300x400 one yields
    // 450x600. Deliberately no `Math.min(1, …)` cap — that would never
    // upscale, so every crop smaller than the target would come out smaller
    // than it does today (a 100x100 crop would drop from 600x600 to 100x100).
    // Math.max(1, …) covers a degenerate selection: 2000x1 would otherwise
    // compute a height of 0 and sharp rejects that outright.
    const scale = targetSize / Math.max(width, height);
    cropTarget = {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }
  pipeline = pipeline.resize({
    width: cropTarget?.width ?? targetSize,
    height: cropTarget?.height ?? targetSize,
    fit: 'cover',
    position: 'attention',
  });

  const webpPath = path.join(outputDir, `${slug}.webp`);
  const jpgPath = path.join(outputDir, `${slug}.jpg`);

  const webpBuffer = await pipeline.clone().webp({ quality: 88 }).toBuffer();
  const jpgBuffer = await pipeline.clone().jpeg({ quality: 88, mozjpeg: true }).toBuffer();

  // Atomic, because these two paths are served by Next.js from `public/` while
  // they are being written: a plain writeFile interrupted halfway hands the
  // browser a truncated image under a URL that looks fine.
  //
  // It does NOT make the pair transactional — dying between the two still
  // leaves a new .webp beside an old .jpg. Both are complete images of the
  // same person, so that is a stale file rather than a corrupt one, and
  // closing it would need a two-phase write nothing here justifies.
  await atomicWriteFile(webpPath, webpBuffer);
  await atomicWriteFile(jpgPath, jpgBuffer);

  const meta = await sharp(webpBuffer).metadata();
  return {
    webp: webpPath,
    jpg: jpgPath,
    width: meta.width ?? targetSize,
    height: meta.height ?? targetSize,
  };
}
