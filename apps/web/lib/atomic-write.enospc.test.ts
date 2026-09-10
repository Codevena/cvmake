// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { atomicWriteFile } from './atomic-write';

/**
 * Its own file for two reasons. `vi.mock` is hoisted over a whole module
 * graph, so `atomic-write.test.ts` would lose the real `writeFile` — and this
 * file runs in the `node` environment, because under the suite's default
 * `happy-dom` the mock of `node:fs/promises` simply does not reach the module
 * under test (measured: the mock fires for this file's own calls and not for
 * the ones inside `atomic-write.ts`).
 *
 * The failure being modelled is a PARTIAL write — the file gets created and
 * then the write fails, which is what ENOSPC looks like. A failure at open
 * creates nothing, so it proves nothing: the cleanup only matters once bytes
 * are on disk. The old code called `writeFile` outside the try, so a partial
 * write left `<target>.<pid>.<ts>.<hex>.tmp` behind for ever — and for
 * `public/photos/` that is a stray file under a directory Next.js serves.
 */
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: vi.fn(async (file: string, data: string | Buffer, ...rest: unknown[]) => {
      if (typeof file === 'string' && file.endsWith('.tmp') && String(data).includes('BOOM')) {
        // Bytes land, then the device fills up.
        await actual.writeFile(file, String(data).slice(0, 3));
        throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
      }
      return actual.writeFile(file, data as never, ...(rest as []));
    }),
  };
});

describe('atomicWriteFile when the device fills up mid-write', () => {
  it('leaves no temp file behind, and does not touch the target', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-enospc-'));
    const target = path.join(dir, 'photo.jpg');
    await writeFile(target, 'PREVIOUS');

    await expect(atomicWriteFile(target, 'BOOM-new-contents')).rejects.toThrow(/ENOSPC/);

    // The previous file is intact — that is the point of writing via rename.
    expect(await readFile(target, 'utf8')).toBe('PREVIOUS');
    // And nothing is left lying around. This is what regressed: cleanup used
    // to run only when `rename` failed, never when the write did.
    expect((await readdir(dir)).filter((f) => f.includes('.tmp'))).toEqual([]);

    await rm(dir, { recursive: true, force: true });
  });

  it('control: a write that succeeds still replaces the target', async () => {
    // Without this the case above would pass against a helper that does
    // nothing at all.
    const dir = await mkdtemp(path.join(tmpdir(), 'aw-enospc-'));
    const target = path.join(dir, 'photo.jpg');
    await writeFile(target, 'PREVIOUS');
    await atomicWriteFile(target, 'fine');
    expect(await readFile(target, 'utf8')).toBe('fine');
    expect((await readdir(dir)).filter((f) => f.includes('.tmp'))).toEqual([]);
    await rm(dir, { recursive: true, force: true });
  });
});
