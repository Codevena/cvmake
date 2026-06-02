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
    // should preserve original path (fallback)
    expect(embedded.personal.photo).toBe('missing.jpg');
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
    // Must stay the original path — the external file must not be embedded
    expect(embedded.personal.photo).toBe('../photo-input.jpg');
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
    expect(embedded.personal.photo).toBe(abs);
  });
});
