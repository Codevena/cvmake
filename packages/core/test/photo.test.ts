import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
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
    const result = await processPhoto({ inputPath: input, outputDir: outDir, slug: 'lena' });
    expect(result.webp).toMatch(/lena\.webp$/);
    expect(result.jpg).toMatch(/lena\.jpg$/);
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

  // The crop rectangle carries the ratio the user dragged; the output must keep
  // it. Before this, every crop was resized to a square, so a portrait
  // selection came out squashed — and `position: 'attention'` re-cropped inside
  // the frame the user had just chosen.
  describe('output dimensions follow the crop', () => {
    const input = () => path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');

    async function dimensionsFor(crop?: {
      left: number;
      top: number;
      width: number;
      height: number;
    }) {
      const result = await processPhoto({
        inputPath: input(),
        outputDir: outDir,
        slug: 'dim',
        ...(crop ? { crop } : {}),
      });
      const meta = await sharp(result.jpg).metadata();
      return `${meta.width}x${meta.height}`;
    }

    it('keeps a 3:4 crop at 3:4 with 600 as the long edge', async () => {
      // WITH the change 450x600; without it 600x600 — the squashing bug.
      expect(await dimensionsFor({ left: 0, top: 0, width: 300, height: 400 })).toBe('450x600');
    });

    it('still produces 600x600 for a square crop', async () => {
      // The counter-probe against a scaling cap: `Math.min(1, …)` would make
      // this 100x100 and put a tiny image into a 140pt frame, and nothing else
      // in this suite would notice.
      expect(await dimensionsFor({ left: 0, top: 0, width: 100, height: 100 })).toBe('600x600');
    });

    it('still produces 600x600 without a crop', async () => {
      expect(await dimensionsFor()).toBe('600x600');
    });

    it('survives a degenerate crop instead of throwing', async () => {
      // Needs its own, wider source: the guard only bites when the short edge
      // rounds to zero, which takes a crop wider than 1200 (600/1300 = 0.46).
      // Without Math.max(1, …) sharp rejects this with "Expected positive
      // integer for height".
      const wide = path.join(outDir, 'wide.png');
      await sharp({
        create: { width: 1400, height: 10, channels: 3, background: { r: 10, g: 20, b: 30 } },
      })
        .png()
        .toFile(wide);
      const result = await processPhoto({
        inputPath: wide,
        outputDir: outDir,
        slug: 'degenerate',
        crop: { left: 0, top: 0, width: 1300, height: 1 },
      });
      const meta = await sharp(result.jpg).metadata();
      expect(`${meta.width}x${meta.height}`).toBe('600x1');
    });
  });
});
