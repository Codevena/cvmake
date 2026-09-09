import { describe, expect, it } from 'vitest';
import { CVDataSchema, ContactsSchema, RenderingSchema } from '../src/cv.js';
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

  it('rejects a half-filled skills section (empty key, empty category)', () => {
    // `skills: {}` no longer belongs here: an entirely empty section means the
    // same as no section and normalises to `undefined` — see "empty skills
    // normalisation". What stays invalid is a section the user started and did
    // not finish.
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

describe('contacts.website scheme restriction', () => {
  const parse = (website: string) => ContactsSchema.safeParse({ website });

  it.each([
    ['javascript:alert(1)', 'script scheme in a rendered link'],
    ['data:text/html,<b>x</b>', 'data scheme'],
    ['ftp://x.example', 'non-web scheme'],
    ['file:///etc/passwd', 'local file'],
    ['mailto:a@b.example', 'address has its own field'],
  ])('rejects %s (%s)', (website) => {
    expect(parse(website).success).toBe(false);
  });

  it.each([['https://ok.example'], ['http://ok.example/a?b=c#d']])('accepts %s', (website) => {
    expect(parse(website).success).toBe(true);
  });

  // The reason the refinement catches the parser: zod runs it even after
  // `.url()` has failed, and `new URL('')` throws out of safeParse. Without the
  // try/catch these two cases crash the editor's resolver and turn a 422 into
  // an unhandled 500 on the save and export routes.
  it.each([[''], ['not a url'], ['http://']])('reports %j as invalid instead of throwing', (v) => {
    expect(() => parse(v)).not.toThrow();
    expect(parse(v).success).toBe(false);
  });
});

describe('rendering.sectionOrder uniqueness', () => {
  const parse = (sectionOrder: string[]) =>
    RenderingSchema.safeParse({ template: 'classic-serif', sectionOrder });

  it('rejects a repeated section', () => {
    const result = parse(['experience', 'experience']);
    expect(result.success).toBe(false);
    if (!result.success) {
      // The error must land on the field, not on `rendering`, or the editor
      // cannot attach it to an input.
      expect(result.error.issues[0]?.path).toEqual(['sectionOrder']);
    }
  });

  it('accepts distinct sections', () => {
    expect(parse(['experience', 'education']).success).toBe(true);
  });

  it('accepts an empty list', () => {
    expect(parse([]).success).toBe(true);
  });
});

describe('empty skills normalisation', () => {
  const base = {
    meta: { locale: 'de' as const },
    personal: { firstName: 'A', lastName: 'B', contacts: {} },
    experience: [],
    education: [],
    rendering: { template: 'classic-serif' },
  };
  const parse = (skills: unknown) => CVDataSchema.safeParse({ ...base, skills });

  it.each([[{}], [{ stack: [] }], [{ categorized: {} }]])(
    'treats %j as no skills section at all',
    (skills) => {
      // Opening the Skills tab registers `skills.stack` and leaves an empty
      // object behind. Rejecting it made the form invalid without the user
      // touching anything: autosave stopped, export greyed out, and nothing
      // said where the problem was.
      const result = parse(skills);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.skills).toBeUndefined();
    },
  );

  it('still rejects a category with no skills in it', () => {
    // Deliberate: a half-added category must keep the form invalid so autosave
    // does not persist it before the user finishes.
    expect(parse({ categorized: { Frontend: [] } }).success).toBe(false);
  });

  it('keeps a section that has content', () => {
    const result = parse({ stack: ['TypeScript'] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.skills).toEqual({ stack: ['TypeScript'] });
  });

  // The normalisation must not become a swallow-everything. Each of these was
  // a precise, named schema error before; an over-broad "is the stack array
  // empty?" test turned all four into a successful parse with the section
  // silently deleted — a PDF with no skills and exit 0, which is the failure
  // mode this release removed from the palette path.
  it.each([
    [{ stacks: ['TypeScript'] }, 'a plural typo in the key'],
    [{ stack: 'TypeScript' }, 'a scalar where a list belongs'],
    [{ stack: 42 }, 'a number where a list belongs'],
    [['TypeScript'], 'a list where the object belongs'],
  ])('still reports %j — %s', (skills) => {
    const result = parse(skills);
    expect(result.success).toBe(false);
  });

  it('names the offending field rather than dropping the section', () => {
    // The value of an error is the path it carries: without it the user is told
    // something is wrong somewhere in a file of a hundred lines.
    const result = parse({ stack: 'TypeScript' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('skills'))).toBe(true);
    }
  });
});
