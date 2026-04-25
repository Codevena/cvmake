import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_YAML = `meta:
  locale: de
personal:
  firstName: M
  lastName: W
  contacts: {}
experience: []
education: []
rendering:
  template: classic-serif
`;

async function call(slug: string) {
  const { GET } = await import('./route');
  return GET(new Request(`http://x/api/cv/${slug}`), { params: Promise.resolve({ slug }) });
}

describe('GET /api/cv/[slug]', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-cvd-'));
    await mkdir(path.join(cwd, 'data', 'cvs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('liefert data + mtime + slug', async () => {
    await writeFile(path.join(cwd, 'data', 'cvs', 'cv.de.yaml'), VALID_YAML);
    const res = await call('cv.de');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe('cv.de');
    expect(typeof body.mtime).toBe('number');
    expect(body.data.personal.firstName).toBe('M');
  });

  it('404 wenn slug nicht existiert', async () => {
    const res = await call('missing');
    expect(res.status).toBe(404);
  });

  it('422 bei broken YAML', async () => {
    await writeFile(path.join(cwd, 'data', 'cvs', 'broken.yaml'), '{ not yaml');
    const res = await call('broken');
    expect(res.status).toBe(422);
  });

  it('blockt path-traversal', async () => {
    const res = await call('..');
    expect(res.status).toBe(400);
  });
});
