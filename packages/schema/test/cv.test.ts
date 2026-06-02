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

  it('lehnt out-of-range Monat in startDate ab (verhindert "undefined <year>")', () => {
    for (const startDate of ['2020-13', '2020-00', '2020-99', 'not-a-date']) {
      expect(() =>
        CVDataSchema.parse({
          ...minimalFixture,
          experience: [{ title: 't', company: 'c', startDate, bullets: [] }],
        }),
      ).toThrow();
    }
  });

  it('akzeptiert YYYY, YYYY-MM und YYYY-MM-DD als startDate', () => {
    for (const startDate of ['2020', '2020-08', '2020-08-15']) {
      expect(() =>
        CVDataSchema.parse({
          ...minimalFixture,
          experience: [{ title: 't', company: 'c', startDate, bullets: [] }],
        }),
      ).not.toThrow();
    }
  });

  it('lehnt gefährliche photo-Schemes ab, erlaubt Pfade/data:image', () => {
    const withPhoto = (photo: string) =>
      CVDataSchema.parse({
        ...minimalFixture,
        personal: { ...minimalFixture.personal, photo },
      });
    expect(() => withPhoto('javascript:alert(1)')).toThrow();
    expect(() => withPhoto('data:text/html,<script>')).toThrow();
    expect(() => withPhoto('photos/me.jpg')).not.toThrow();
    expect(() => withPhoto('/photos/me.jpg')).not.toThrow();
    expect(() => withPhoto('data:image/png;base64,AAAA')).not.toThrow();
  });

  it('verlangt bare github/linkedin-Handles (keine URLs)', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        personal: {
          ...minimalFixture.personal,
          contacts: { github: 'https://evil.com/x' },
        },
      }),
    ).toThrow();
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        personal: { ...minimalFixture.personal, contacts: { github: 'codevena' } },
      }),
    ).not.toThrow();
  });

  it('lehnt doppelte customSection-IDs ab', () => {
    expect(() =>
      CVDataSchema.parse({
        ...minimalFixture,
        customSections: [
          { id: 'x', title: 'A', items: [] },
          { id: 'x', title: 'B', items: [] },
        ],
      }),
    ).toThrow();
  });

  it('lehnt leere Skills ab (weder stack noch categorized, leere Kategorie, leerer Key)', () => {
    expect(() => CVDataSchema.parse({ ...minimalFixture, skills: {} })).toThrow();
    expect(() =>
      CVDataSchema.parse({ ...minimalFixture, skills: { categorized: { '': ['x'] } } }),
    ).toThrow();
    // empty category items array → invalid (would render an empty heading)
    expect(() =>
      CVDataSchema.parse({ ...minimalFixture, skills: { categorized: { Backend: [] } } }),
    ).toThrow();
    expect(() =>
      CVDataSchema.parse({ ...minimalFixture, skills: { stack: ['TS'] } }),
    ).not.toThrow();
    expect(() =>
      CVDataSchema.parse({ ...minimalFixture, skills: { categorized: { Backend: ['Node'] } } }),
    ).not.toThrow();
  });
});
