import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { atomicWriteFile } from './atomic-write';

describe('atomicWriteFile', () => {
  it('schreibt neue Datei', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-'));
    const target = path.join(dir, 'a.txt');
    await atomicWriteFile(target, 'hello');
    expect(await readFile(target, 'utf8')).toBe('hello');
    await rm(dir, { recursive: true, force: true });
  });
  it('überschreibt bestehende Datei', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-'));
    const target = path.join(dir, 'b.txt');
    await writeFile(target, 'old');
    await atomicWriteFile(target, 'new');
    expect(await readFile(target, 'utf8')).toBe('new');
    await rm(dir, { recursive: true, force: true });
  });

  it('überlebt parallele Writes ohne Temp-Path-Kollision', async () => {
    // Without crypto randomness in the temp filename, two concurrent same-
    // process writes that share Date.now() will collide on the temp path
    // and one of them will fail / corrupt the other. The randomBytes suffix
    // must guarantee uniqueness, so the last writer always wins with a clean
    // result and no errors are thrown.
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-'));
    const target = path.join(dir, 'c.txt');
    const writers = Array.from({ length: 16 }, (_, i) => atomicWriteFile(target, `payload-${i}`));
    await expect(Promise.all(writers)).resolves.not.toThrow();
    const final = await readFile(target, 'utf8');
    expect(final).toMatch(/^payload-\d+$/);
    await rm(dir, { recursive: true, force: true });
  });
});
