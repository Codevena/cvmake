import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { processPhoto } from '../src/photo.js';

describe('processPhoto', () => {
  let outDir = '';
  beforeEach(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), 'forq-photo-'));
  });
  afterEach(() => rm(outDir, { recursive: true, force: true }));

  it('erzeugt .webp + .jpg Variante im Zielordner', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    const result = await processPhoto({ inputPath: input, outputDir: outDir, slug: 'alex' });
    expect(result.webp).toMatch(/alex\.webp$/);
    expect(result.jpg).toMatch(/alex\.jpg$/);
    expect((await readFile(result.webp)).byteLength).toBeGreaterThan(100);
    expect((await readFile(result.jpg)).byteLength).toBeGreaterThan(100);
  });

  it('lehnt zu große Dateien ab (>10MB)', async () => {
    await expect(
      processPhoto({ inputPath: 'nonexistent', outputDir: outDir, slug: 'x', maxBytes: 1 }),
    ).rejects.toThrow();
  });

  it('wendet das crop-Rechteck vor resize an', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    const noCrop = await processPhoto({ inputPath: input, outputDir: outDir, slug: 'a' });
    const noCropBytes = (await readFile(noCrop.jpg)).byteLength;
    const cropped = await processPhoto({
      inputPath: input,
      outputDir: outDir,
      slug: 'b',
      crop: { left: 0, top: 0, width: 100, height: 100 },
    });
    const croppedBytes = (await readFile(cropped.jpg)).byteLength;
    expect(croppedBytes).not.toBe(noCropBytes);
  });

  it('lehnt out-of-bounds crop ab', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    await expect(
      processPhoto({
        inputPath: input,
        outputDir: outDir,
        slug: 'oob',
        crop: { left: 0, top: 0, width: 99999, height: 99999 },
      }),
    ).rejects.toThrow();
  });
});
