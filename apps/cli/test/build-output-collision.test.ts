import {
  copyFileSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the PDF path so this suite never launches Chromium. The stub still
// RETURNS bytes, which is the whole point: without the guard, runBuild reaches
// writeFile and those bytes land on top of the input YAML. A stub that produced
// nothing would make the unguarded failure unreproducible and the test vacuous.
const PDF_BYTES = Buffer.from('%PDF-1.4\n% stub bytes, not a real document\n');

vi.mock('@codevena/cvmake-core/pdf', () => ({
  generatePDF: vi.fn(async () => PDF_BYTES),
  shutdownPdfBrowser: vi.fn(async () => {}),
  prewarmPdfBrowser: vi.fn(async () => {}),
}));

const { runBuild } = await import('../src/commands/build.js');

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'multipage.en.yaml',
);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'cvmake-collision-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Every case here is a way of naming the INPUT file as the OUTPUT. Each one
 * destroyed the user's CV before the guard existed: runBuild rendered a PDF and
 * wrote it over the source YAML, exit 0, no warning.
 */
describe('runBuild refuses to overwrite its input', () => {
  it('rejects the identical path', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    const before = readFileSync(cv);

    await expect(runBuild({ yaml: cv, output: cv })).rejects.toThrow(/same file/i);

    expect(readFileSync(cv).equals(before)).toBe(true);
  });

  it('rejects a hard link to the input', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    const before = readFileSync(cv);
    const hard = path.join(dir, 'hard.yaml');
    linkSync(cv, hard);

    // No path canonicalisation can detect this one — two real directory
    // entries, no symlink, same inode. Only the dev/ino comparison sees it.
    await expect(runBuild({ yaml: cv, output: hard })).rejects.toThrow(/same file/i);

    expect(readFileSync(cv).equals(before)).toBe(true);
  });

  // NOTE: this case only MEASURES anything on a case-insensitive filesystem
  // (macOS default). On case-sensitive CI it takes the else branch, where the
  // guarded and unguarded outcomes are identical and nothing is proven.
  it('rejects a case-only spelling on a case-insensitive filesystem', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    const before = readFileSync(cv);
    const shouted = path.join(dir, 'CV.YAML');

    // On a case-sensitive filesystem CV.YAML is genuinely a different file and
    // writing it is correct, so assert the destructive outcome only where the
    // collision actually exists.
    let sameFileOnThisFs = false;
    try {
      sameFileOnThisFs = readFileSync(shouted).equals(before);
    } catch {
      sameFileOnThisFs = false;
    }

    if (sameFileOnThisFs) {
      await expect(runBuild({ yaml: cv, output: shouted })).rejects.toThrow(/same file/i);
      expect(readFileSync(cv).equals(before)).toBe(true);
    } else {
      await runBuild({ yaml: cv, output: shouted });
      expect(readFileSync(cv).equals(before)).toBe(true);
    }
  });

  it('rejects a symlink pointing back at the input', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    const before = readFileSync(cv);
    const link = path.join(dir, 'link.yaml');
    symlinkSync(cv, link);

    await expect(runBuild({ yaml: cv, output: link })).rejects.toThrow(/same file/i);

    expect(readFileSync(cv).equals(before)).toBe(true);
  });

  it('still writes when the output is a genuinely different file', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    const before = readFileSync(cv);
    const out = path.join(dir, 'out.pdf');

    await runBuild({ yaml: cv, output: out });

    expect(readFileSync(out).equals(PDF_BYTES)).toBe(true);
    expect(readFileSync(cv).equals(before)).toBe(true);
  });

  it('does not reject an output path that does not exist yet', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    const out = path.join(dir, 'nested', 'deep', 'out.pdf');

    await runBuild({ yaml: cv, output: out });

    expect(readFileSync(out).equals(PDF_BYTES)).toBe(true);
  });

  it('does not confuse two distinct files with identical content', async () => {
    const cv = path.join(dir, 'cv.yaml');
    copyFileSync(FIXTURE, cv);
    // Byte-identical copy, different inode — a content-based check would wrongly
    // reject this; an inode-based one must not.
    const twin = path.join(dir, 'twin.yaml');
    writeFileSync(twin, readFileSync(cv));

    await runBuild({ yaml: cv, output: twin });

    expect(readFileSync(twin).equals(PDF_BYTES)).toBe(true);
  });
});
