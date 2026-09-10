import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The photo outputs land in `public/photos/`, which Next.js serves. A reader
 * can therefore fetch `<slug>.webp` at the exact moment it is being rewritten,
 * and a plain `writeFile` hands them a truncated image under a URL that looks
 * perfectly normal.
 *
 * The failure modelled here is a partial write — bytes on disk, then the
 * device fills up. A failure at open creates nothing and proves nothing.
 *
 * What is deliberately NOT claimed: that the two outputs are written as a
 * pair. Per-file atomicity does not pair them, and dying between the two still
 * leaves a new .webp beside an old .jpg. Both are then whole images of the
 * same person, which is stale rather than corrupt.
 */
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: vi.fn(async (file: string, data: string | Buffer, ...rest: unknown[]) => {
      if (typeof file === 'string' && file.includes('.tmp') && globalThis.__failWrite === true) {
        await actual.writeFile(file, Buffer.from('trunc'));
        throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
      }
      return actual.writeFile(file, data as never, ...(rest as []));
    }),
  };
});

declare global {
  var __failWrite: boolean | undefined;
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'photo-atomic-'));
  globalThis.__failWrite = false;
});
afterEach(async () => {
  globalThis.__failWrite = false;
  await rm(dir, { recursive: true, force: true });
});

describe('the photo outputs are written atomically', () => {
  it('a full disk leaves the previous image intact and no temp behind', async () => {
    const { atomicWriteFile } = await import('../src/atomic-write.js');
    const target = path.join(dir, 'me.webp');
    await writeFile(target, 'PREVIOUS-IMAGE-BYTES');

    globalThis.__failWrite = true;
    await expect(atomicWriteFile(target, Buffer.from('NEW-IMAGE-BYTES'))).rejects.toThrow(/ENOSPC/);

    // Not truncated — this is what a plain writeFile would have destroyed.
    expect(await readFile(target, 'utf8')).toBe('PREVIOUS-IMAGE-BYTES');
    expect((await readdir(dir)).filter((f) => f.includes('.tmp'))).toEqual([]);
  });

  it('control: a successful write really does replace the image', async () => {
    // Without this the case above would pass against a helper that writes
    // nothing at all.
    const { atomicWriteFile } = await import('../src/atomic-write.js');
    const target = path.join(dir, 'me.webp');
    await writeFile(target, 'PREVIOUS-IMAGE-BYTES');
    await atomicWriteFile(target, Buffer.from('NEW-IMAGE-BYTES'));
    expect(await readFile(target, 'utf8')).toBe('NEW-IMAGE-BYTES');
    expect((await readdir(dir)).filter((f) => f.includes('.tmp'))).toEqual([]);
  });

  it('the temp file is a sibling of the target, not in the system temp dir', async () => {
    // A temp in os.tmpdir() usually sits on another filesystem, where rename
    // degrades to a copy — and a copy is not atomic. This is the property the
    // whole helper rests on, so it is asserted rather than assumed.
    const { atomicWriteFile } = await import('../src/atomic-write.js');
    const seen: string[] = [];
    const fs = await import('node:fs/promises');
    const spy = vi.spyOn(fs, 'writeFile').mockImplementation((async (f: string, d: unknown) => {
      seen.push(String(f));
      return (await importActual()).writeFile(String(f), d as never);
    }) as never);
    async function importActual() {
      return (await vi.importActual('node:fs/promises')) as typeof import('node:fs/promises');
    }
    await atomicWriteFile(path.join(dir, 'me.webp'), Buffer.from('x'));
    spy.mockRestore();
    expect(seen).toHaveLength(1);
    expect(path.dirname(seen[0] as string)).toBe(dir);
  });
});
