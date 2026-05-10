import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const UPDATE = process.env.UPDATE_VISUAL === '1';
export const THRESHOLD_RATIO = 0.001;
export const PIXELMATCH_THRESHOLD = 0.1;

export interface DiffInput {
  templateId: string;
  paletteId: string;
  pageNumber?: number;
  png: Buffer;
}

export interface DiffResult {
  ratio: number;
  baselineWritten: boolean;
}

export async function diffAgainstBaseline({
  templateId,
  paletteId,
  pageNumber = 1,
  png,
}: DiffInput): Promise<DiffResult> {
  const baselineDir = path.resolve(`__tests__/__visual__/${templateId}`);
  const actualDir = path.resolve(`__tests__/__visual__/${templateId}/.actual`);
  const filename = `${paletteId}.page${pageNumber}.png`;
  const baselinePath = path.join(baselineDir, filename);
  const actualPath = path.join(actualDir, filename);
  const diffPath = path.join(
    actualDir,
    `${paletteId}.page${pageNumber}.diff.png`,
  );

  await mkdir(actualDir, { recursive: true });
  await writeFile(actualPath, png);

  if (UPDATE || !existsSync(baselinePath)) {
    await mkdir(baselineDir, { recursive: true });
    await writeFile(baselinePath, png);
    return { ratio: 0, baselineWritten: true };
  }

  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(png);
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const mismatched = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: PIXELMATCH_THRESHOLD },
  );
  const total = baseline.width * baseline.height;
  const ratio = mismatched / total;

  if (ratio >= THRESHOLD_RATIO) {
    await writeFile(diffPath, PNG.sync.write(diff));
  }

  return { ratio, baselineWritten: false };
}
