import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

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
  }
  pipeline = pipeline.resize({
    width: targetSize,
    height: targetSize,
    fit: 'cover',
    position: 'attention',
  });

  const webpPath = path.join(outputDir, `${slug}.webp`);
  const jpgPath = path.join(outputDir, `${slug}.jpg`);

  const webpBuffer = await pipeline.clone().webp({ quality: 88 }).toBuffer();
  const jpgBuffer = await pipeline.clone().jpeg({ quality: 88, mozjpeg: true }).toBuffer();

  await writeFile(webpPath, webpBuffer);
  await writeFile(jpgPath, jpgBuffer);

  const meta = await sharp(webpBuffer).metadata();
  return {
    webp: webpPath,
    jpg: jpgPath,
    width: meta.width ?? targetSize,
    height: meta.height ?? targetSize,
  };
}
