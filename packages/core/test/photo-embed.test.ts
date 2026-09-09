import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { embedPhoto } from '../src/photo-embed.js';

describe('embedPhoto', () => {
  it('inlines JPEG as data URL', async () => {
    const baseDir = path.join(import.meta.dirname, 'fixtures');
    const data = {
      meta: { locale: 'de' as const },
      personal: {
        firstName: 'A',
        lastName: 'B',
        photo: 'photo-input.jpg',
        contacts: {},
      },
      experience: [],
      education: [],
      rendering: { template: 'x' },
    };
    const embedded = await embedPhoto(data, baseDir);
    expect(embedded.personal.photo).toMatch(/^data:image\/jpeg;base64,/);
    expect(embedded.personal.photo?.length).toBeGreaterThan(100);
  });

  it('leaves photo empty if file missing', async () => {
    const data = {
      meta: { locale: 'de' as const },
      personal: {
        firstName: 'A',
        lastName: 'B',
        photo: 'missing.jpg',
        contacts: {},
      },
      experience: [],
      education: [],
      rendering: { template: 'x' },
    };
    const embedded = await embedPhoto(data, '/nonexistent');
    // The field is dropped, not preserved: a path that could not be embedded
    // would otherwise be rendered as a live `<img src>`, and the templates
    // only fall back to initials when the field is actually gone.
    expect(embedded.personal.photo).toBeUndefined();
  });

  it('handles data URL already (idempotent)', async () => {
    const url = 'data:image/jpeg;base64,abc';
    const data = {
      meta: { locale: 'de' as const },
      personal: {
        firstName: 'A',
        lastName: 'B',
        photo: url,
        contacts: {},
      },
      experience: [],
      education: [],
      rendering: { template: 'x' },
    };
    const embedded = await embedPhoto(data, '/whatever');
    expect(embedded.personal.photo).toBe(url);
  });

  it('no-op if photo undefined', async () => {
    const data = {
      meta: { locale: 'de' as const },
      personal: { firstName: 'A', lastName: 'B', contacts: {} },
      experience: [],
      education: [],
      rendering: { template: 'x' },
    };
    const embedded = await embedPhoto(data, '/whatever');
    expect(embedded.personal.photo).toBeUndefined();
  });

  // Security: photo paths must stay contained within baseDir. A relative `..`
  // payload that escapes baseDir to an existing image-extension file must NOT
  // be read and embedded (path-traversal / arbitrary file read).
  it('blocks relative path traversal that escapes baseDir', async () => {
    const fixturesDir = path.join(import.meta.dirname, 'fixtures');
    // photo-input.jpg lives in fixturesDir, i.e. OUTSIDE this baseDir
    const baseDir = path.join(fixturesDir, 'subdir');
    const data = {
      meta: { locale: 'de' as const },
      personal: {
        firstName: 'A',
        lastName: 'B',
        photo: '../photo-input.jpg',
        contacts: {},
      },
      experience: [],
      education: [],
      rendering: { template: 'x' },
    };
    const embedded = await embedPhoto(data, baseDir);
    // The file outside baseDir must not be read, and the traversal value must
    // not survive into the document either. Dropping the field satisfies both
    // at once, so one assertion carries them: a `data:` value here would mean
    // the file WAS read, any other value would mean it reached the renderer.
    expect(embedded.personal.photo).toBeUndefined();
  });

  it('blocks absolute photo path outside baseDir', async () => {
    const fixturesDir = path.join(import.meta.dirname, 'fixtures');
    const abs = path.join(fixturesDir, 'photo-input.jpg');
    const baseDir = path.join(import.meta.dirname, 'unrelated-base');
    const data = {
      meta: { locale: 'de' as const },
      personal: {
        firstName: 'A',
        lastName: 'B',
        photo: abs,
        contacts: {},
      },
      experience: [],
      education: [],
      rendering: { template: 'x' },
    };
    const embedded = await embedPhoto(data, baseDir);
    expect(embedded.personal.photo).toBeUndefined();
  });

  // The postcondition the renderer relies on. It is a property over the whole
  // hostile corpus rather than a handful of cases, because the dangerous set is
  // "did not become an embedded image and is still in <img src>" — which is
  // larger than any list of schemes someone thinks to enumerate.
  describe('postcondition: photo is absent or an embedded image', () => {
    const hostile = [
      '',
      'http://169.254.169.254/x.jpg',
      'http://169.254.169.254/latest/meta-data/',
      'https://evil.example/x.jpg',
      'ht\ttp://169.254.169.254/x.jpg',
      '//evil.example/x.jpg',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,<b>x</b>',
      '../../../../etc/passwd.png',
      '/etc/passwd.png',
      'missing.jpg',
      'no-extension',
      '/photos/missing.jpg',
    ];

    it.each(hostile)('holds for %j', async (photo) => {
      const data = {
        meta: { locale: 'de' as const },
        personal: { firstName: 'A', lastName: 'B', photo, contacts: {} },
        experience: [],
        education: [],
        rendering: { template: 'x' },
      };
      const out = await embedPhoto(data, path.join(import.meta.dirname, 'fixtures'));
      const result = out.personal.photo;
      expect(result === undefined || /^data:image\//i.test(result)).toBe(true);
    });

    it('holds for a /photos/ value when no public/ directory exists at all', async () => {
      // Reaches the one branch the corpus above cannot: run from a baseDir
      // outside the repo, findPublicDir returns null. Inside the repo it always
      // finds public/photos/, so this branch stayed unmeasured — the mutation
      // round proved it by surviving.
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'cvmake-nopublic-'));
      try {
        const data = {
          meta: { locale: 'de' as const },
          personal: { firstName: 'A', lastName: 'B', photo: '/photos/x.jpg', contacts: {} },
          experience: [],
          education: [],
          rendering: { template: 'x' },
        };
        const out = await embedPhoto(data, tmp);
        expect(out.personal.photo).toBeUndefined();
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('and the legitimate path still becomes an embedded image', async () => {
      // The counter-number for the whole block: if this goes red, the guard is
      // dropping photos it should keep.
      const data = {
        meta: { locale: 'de' as const },
        personal: { firstName: 'A', lastName: 'B', photo: 'photo-input.jpg', contacts: {} },
        experience: [],
        education: [],
        rendering: { template: 'x' },
      };
      const out = await embedPhoto(data, path.join(import.meta.dirname, 'fixtures'));
      expect(out.personal.photo).toMatch(/^data:image\/jpeg;base64,/);
    });
  });
});

// Uploaded photos live flat under data/cvs/photos/, so `/photos/<name>`
// addresses anyone's file. A caller that serves several people has to say whose
// document this is — and a caller that CANNOT say must be refused, not waved
// through with the single-user behaviour.
describe('photo ownership for multi-user callers', () => {
  // A real tree, because the earlier version of these cases asserted
  // `undefined` against a fixture directory that has no `public/photos` at all
  // — every case passed for the wrong reason, and the positive control could
  // not have failed. Here the bytes are really on disk, so "refused" and
  // "embedded" are distinguishable outcomes.
  let root: string;
  const withPhoto = (photo: string) => ({
    meta: { locale: 'de' as const },
    personal: { firstName: 'A', lastName: 'B', photo, contacts: {} },
    experience: [],
    education: [],
    rendering: { template: 'x' },
  });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'cvmake-owner-'));
    // `public/photos` is what the editor serves and what `/photos/<name>`
    // resolves to; `data/cvs/photos` is the upload staging directory a relative
    // `photos/<name>` resolves to. Both are reachable from a CV document, and
    // both therefore need the same owner rule.
    await mkdir(path.join(root, 'public', 'photos'), { recursive: true });
    await mkdir(path.join(root, 'data', 'cvs', 'photos'), { recursive: true });
    for (const f of ['cv.de.png', 'cv.png', 'someone-else.png']) {
      await writeFile(path.join(root, 'public', 'photos', f), png);
      await writeFile(path.join(root, 'data', 'cvs', 'photos', f), png);
    }
    // The traversal targets have to EXIST, or a refusal is indistinguishable
    // from a missing file — which is exactly why the previous version of these
    // tests proved nothing.
    await mkdir(path.join(root, 'public', 'photos', 'sub'), { recursive: true });
    await writeFile(path.join(root, 'public', 'photos', 'sub', 'cv.de.png'), png);
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const cvDir = () => path.join(root, 'data', 'cvs');
  const OWNER = { kind: 'slug' as const, slug: 'cv.de' };

  it('embeds the owner’s own photo', async () => {
    // The positive control. Without it every refusal below could be a missing
    // file rather than a refusal.
    const out = await embedPhoto(withPhoto('/photos/cv.de.png'), cvDir(), OWNER);
    expect(out.personal.photo?.startsWith('data:image/') ?? false).toBe(true);
  });

  it('refuses a photo belonging to another slug', async () => {
    const out = await embedPhoto(withPhoto('/photos/someone-else.png'), cvDir(), OWNER);
    expect(out.personal.photo).toBeUndefined();
  });

  it('refuses the relative spelling of the same file', async () => {
    // `photos/<someone-else>.jpg` is the exact string the audit finding names.
    // It resolves through the OTHER branch, against the upload staging
    // directory, and guarding only the absolute `/photos/` form moved the hole
    // instead of closing it.
    const out = await embedPhoto(withPhoto('photos/someone-else.png'), cvDir(), OWNER);
    expect(out.personal.photo).toBeUndefined();
  });

  it('embeds the owner’s own photo through the relative spelling too', async () => {
    const out = await embedPhoto(withPhoto('photos/cv.de.png'), cvDir(), OWNER);
    expect(out.personal.photo?.startsWith('data:image/') ?? false).toBe(true);
  });

  it.each([
    ['/photos/cv.de./../someone-else.png', 'leave and re-enter the directory'],
    ['/photos/cv.de.x/../someone-else.png', 'the same with a deeper stem'],
    ['/photos/sub/cv.de.png', 'a subdirectory that ends in the right name'],
  ])('refuses %s (%s)', async (photo) => {
    // The prefix test used to run on the RAW remainder while the containment
    // guard ran after normalisation, so a traversal satisfied both: the string
    // starts with `cv.de.`, and path.join resolves it back inside photos/.
    // Measured through the real route before the fix: 200, with the other
    // person's image in the PDF.
    const out = await embedPhoto(withPhoto(photo), cvDir(), OWNER);
    expect(out.personal.photo).toBeUndefined();
  });

  it('accepts any extension, as long as the stem is the owner', async () => {
    // The counter-probe for the rule above: the check is on the stem, so a
    // different image format must not become an accidental refusal.
    await writeFile(path.join(root, 'public', 'photos', 'cv.de.webp'), png);
    const out = await embedPhoto(withPhoto('/photos/cv.de.webp'), cvDir(), OWNER);
    expect(out.personal.photo?.startsWith('data:image/') ?? false).toBe(true);
  });

  it('does not let a dotted slug reach a longer one', async () => {
    // Slugs may contain dots, so `startsWith(slug + '.')` lets the owner of
    // `cv` read `cv.de.png`. The extension is stripped exactly once and the
    // remainder must equal the slug.
    const out = await embedPhoto(withPhoto('/photos/cv.de.png'), cvDir(), {
      kind: 'slug',
      slug: 'cv',
    });
    expect(out.personal.photo).toBeUndefined();
  });

  it('refuses every /photos/ value when the owner cannot be established', async () => {
    // The request that omits its slug is exactly the one the restriction has to
    // catch; falling back to "unrestricted" here would leave the hole open.
    const out = await embedPhoto(withPhoto('/photos/cv.de.png'), cvDir(), { kind: 'none' });
    expect(out.personal.photo).toBeUndefined();
  });

  it('leaves the single-user caller alone', async () => {
    // The CLI has no tenants. Passing no owner keeps the previous behaviour —
    // and this now really embeds, rather than passing because the file is
    // missing.
    const out = await embedPhoto(withPhoto('/photos/someone-else.png'), cvDir());
    expect(out.personal.photo?.startsWith('data:image/') ?? false).toBe(true);
  });
});
