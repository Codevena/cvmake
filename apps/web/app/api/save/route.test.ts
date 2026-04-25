import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_DATA = {
  meta: { locale: 'de', updatedAt: '2026-04-25' },
  personal: { firstName: 'M', lastName: 'W', contacts: {} },
  experience: [],
  education: [],
  rendering: { template: 'classic-serif' },
};
const VALID_YAML = `meta: { locale: de }
personal: { firstName: M, lastName: W, contacts: {} }
experience: []
education: []
rendering: { template: classic-serif }
`;

async function post(body: unknown) {
  const { POST } = await import('./route');
  return POST(
    new Request('http://x/api/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('POST /api/save', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-save-'));
    await mkdir(path.join(cwd, 'data', 'cvs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('200 bei mtime-match: schreibt YAML und gibt neue mtime', async () => {
    const target = path.join(cwd, 'data', 'cvs', 'cv.de.yaml');
    await writeFile(target, VALID_YAML);
    const before = (await stat(target)).mtimeMs;
    const res = await post({ slug: 'cv.de', data: VALID_DATA, expectedMtime: before });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.mtime).toBe('number');
    const written = await readFile(target, 'utf8');
    expect(written).toContain('firstName: M');
  });

  it('409 bei mtime-mismatch mit currentData', async () => {
    const target = path.join(cwd, 'data', 'cvs', 'cv.de.yaml');
    await writeFile(target, VALID_YAML);
    const res = await post({ slug: 'cv.de', data: VALID_DATA, expectedMtime: 1 });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.kind).toBe('conflict');
    expect(body.currentData).toBeDefined();
    expect(typeof body.currentMtime).toBe('number');
  });

  it('422 bei Zod-Fail', async () => {
    const target = path.join(cwd, 'data', 'cvs', 'cv.de.yaml');
    await writeFile(target, VALID_YAML);
    const before = (await stat(target)).mtimeMs;
    const bad = { ...VALID_DATA, personal: { ...VALID_DATA.personal, firstName: 123 } };
    const res = await post({ slug: 'cv.de', data: bad, expectedMtime: before });
    expect(res.status).toBe(422);
  });

  it('400 bei ungültigem Slug', async () => {
    const res = await post({ slug: '..', data: VALID_DATA, expectedMtime: 1 });
    expect(res.status).toBe(400);
  });
});
