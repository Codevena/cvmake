import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { processPhoto } from '../src/photo.js';

describe('processPhoto', () => {
  let outDir = '';
  beforeEach(async () => {
    outDir = await mkdtemp(path.join(tmpdir(), 'forq-photo-'));
  });
  afterEach(() => rm(outDir, { recursive: true, force: true }));

  it('erzeugt .webp + .jpg Variante im Zielordner', async () => {
    const input = path.join(import.meta.dirname, 'fixtures', 'photo-input.jpg');
    const result = await processPhoto({ inputPath: input, outputDir: outDir, slug: 'markus' });
    expect(result.webp).toMatch(/markus\.webp$/);
    expect(result.jpg).toMatch(/markus\.jpg$/);
    expect((await readFile(result.webp)).byteLength).toBeGreaterThan(100);
    expect((await readFile(result.jpg)).byteLength).toBeGreaterThan(100);
  });

  it('lehnt zu große Dateien ab (>10MB)', async () => {
    await expect(
      processPhoto({ inputPath: 'nonexistent', outputDir: outDir, slug: 'x', maxBytes: 1 }),
    ).rejects.toThrow();
  });
});
