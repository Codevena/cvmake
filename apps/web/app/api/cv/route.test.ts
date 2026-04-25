import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GET /api/cv', () => {
  let cwd = '';
  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'forq-cv-'));
    await mkdir(path.join(cwd, 'data', 'cvs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cwd, { recursive: true, force: true });
  });

  it('listet Slugs aus data/cvs/*.yaml', async () => {
    await writeFile(
      path.join(cwd, 'data', 'cvs', 'cv.de.yaml'),
      'meta:\n  locale: de\npersonal:\n  firstName: M\n  lastName: W\n  contacts: {}\nexperience: []\neducation: []\nrendering:\n  template: classic-serif\n',
    );
    await writeFile(path.join(cwd, 'data', 'cvs', 'broken.yaml'), 'not: valid: yaml: here');
    const { GET } = await import('./route');
    const res = await GET();
    const body = await res.json();
    const slugs = body.items.map((i: { slug: string }) => i.slug).sort();
    expect(slugs).toEqual(['broken', 'cv.de']);
    const cvDe = body.items.find((i: { slug: string }) => i.slug === 'cv.de');
    expect(cvDe.displayName).toContain('M W');
    const broken = body.items.find((i: { slug: string }) => i.slug === 'broken');
    expect(broken.displayName).toBe('broken');
  });
});
