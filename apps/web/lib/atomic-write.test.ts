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
});
