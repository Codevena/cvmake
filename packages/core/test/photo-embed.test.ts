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
});
