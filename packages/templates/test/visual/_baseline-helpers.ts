import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export const UPDATE = process.env.UPDATE_VISUAL === '1';
// In CI we never silently auto-create missing baselines: a missing baseline
// must be a hard failure so that the protected matrix can't be bypassed by
// committing a partially-deleted baseline directory. Local devs still get
// the auto-create path for the first run on a new template.
export const STRICT_BASELINE = process.env.CI === 'true' && !UPDATE;
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
  const diffPath = path.join(actualDir, `${paletteId}.page${pageNumber}.diff.png`);

  await mkdir(actualDir, { recursive: true });
  await writeFile(actualPath, png);

  if (!existsSync(baselinePath) && STRICT_BASELINE) {
    throw new Error(
      `Baseline missing for ${templateId}/${paletteId} (page ${pageNumber}). ` +
        'In CI, missing baselines are hard failures. Commit the baseline ' +
        'or run the update-baselines workflow.',
    );
  }

  if (UPDATE || !existsSync(baselinePath)) {
    await mkdir(baselineDir, { recursive: true });
    await writeFile(baselinePath, png);
    return { ratio: 0, baselineWritten: true };
  }

  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(png);
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `Dimension mismatch for ${templateId}/${paletteId}: ` +
        `baseline ${baseline.width}x${baseline.height} vs actual ${actual.width}x${actual.height}. ` +
        'Viewport changed? Re-generate the baseline via UPDATE_VISUAL=1 or the update-baselines workflow.',
    );
  }
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
