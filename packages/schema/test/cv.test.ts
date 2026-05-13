import { describe, expect, it } from 'vitest';
import { CVDataSchema } from '../src/cv.js';
import { fullFixture, minimalFixture } from '../src/fixtures.js';

describe('CVDataSchema', () => {
  it('akzeptiert das Minimal-Fixture', () => {
    expect(() => CVDataSchema.parse(minimalFixture)).not.toThrow();
  });

  it('akzeptiert das Voll-Fixture', () => {
    expect(() => CVDataSchema.parse(fullFixture)).not.toThrow();
  });

  it('verbietet unbekannte Top-Level-Felder (strict)', () => {
    expect(() => CVDataSchema.parse({ ...minimalFixture, extra: 'nope' })).toThrow();
  });

  it('erzwingt locale de|en', () => {
    expect(() => CVDataSchema.parse({ ...minimalFixture, meta: { locale: 'fr' } })).toThrow();
  });

  it('validiert E-Mail-Format', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        personal: { ...minimalFixture.personal, contacts: { email: 'kein-email' } },
      }),
    ).toThrow();
  });

  it('validiert accentOverride als Hex-Farbe', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        rendering: { template: 'classic-serif', accentOverride: 'red' },
      }),
    ).toThrow();
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        rendering: { template: 'classic-serif', accentOverride: '#7a8894' },
      }),
    ).not.toThrow();
  });

  it('erzwingt language-level enum', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        languages: [{ name: 'DE', level: 'muttersprache' }],
      }),
    ).toThrow();
  });
});
