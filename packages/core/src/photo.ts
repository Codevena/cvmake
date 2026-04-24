import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export interface ProcessPhotoOptions {
  inputPath: string;
  outputDir: string;
  slug: string;
  maxBytes?: number | undefined;
  targetSize?: number | undefined;
}

export interface ProcessedPhoto {
  webp: string;
  jpg: string;
  width: number;
  height: number;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TARGET = 600;
const SLUG_RE = /^[a-z0-9-]+$/;

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
  const pipeline = sharp(buffer).rotate().resize({
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
