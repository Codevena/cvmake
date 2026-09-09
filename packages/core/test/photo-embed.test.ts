import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
