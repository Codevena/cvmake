import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function post(form: FormData) {
  const { POST } = await import('./route');
  return POST(new Request('http://x/api/upload', { method: 'POST', body: form }));
}

describe('POST /api/upload', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-up-'));
    await mkdir(path.join(cwd, 'public', 'photos'), { recursive: true });
    await mkdir(path.join(cwd, 'data', 'cvs', 'photos'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('200: schreibt webp + jpg, cleanup temp', async () => {
    const fixture = await readFile(
      path.resolve(__dirname, '../../../../../packages/core/test/fixtures/photo-input.jpg'),
    );
    const form = new FormData();
    form.append('file', new Blob([fixture], { type: 'image/jpeg' }), 'p.jpg');
    form.append('slug', 'cv.de');
    form.append('crop', JSON.stringify({ x: 0, y: 0, width: 100, height: 100 }));
    form.append('aspect', '1:1');
    const res = await post(form);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.webp).toBe('/photos/cv.de.webp');
    expect(body.jpg).toBe('/photos/cv.de.jpg');
    const stagingFiles = await readdir(path.join(cwd, 'data', 'cvs', 'photos'));
    expect(stagingFiles).toEqual([]);
  });

  it('400 bei ungültigem Slug', async () => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }), 'p.jpg');
    form.append('slug', '..');
    form.append('crop', JSON.stringify({ x: 0, y: 0, width: 1, height: 1 }));
    form.append('aspect', '1:1');
    const res = await post(form);
    expect(res.status).toBe(400);
  });

  it('413 wenn Datei größer als 10 MB', async () => {
    // 10 MB + 1 byte → must be rejected before we attempt to buffer/process.
    const oversize = new Uint8Array(10 * 1024 * 1024 + 1);
    const form = new FormData();
    form.append('file', new Blob([oversize], { type: 'image/jpeg' }), 'big.jpg');
    form.append('slug', 'cv.de');
    form.append('crop', JSON.stringify({ x: 0, y: 0, width: 1, height: 1 }));
    form.append('aspect', '1:1');
    const res = await post(form);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.kind).toBe('too_large');
    expect(body.maxBytes).toBe(10 * 1024 * 1024);
  });
});
