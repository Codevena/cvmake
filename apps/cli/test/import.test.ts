import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCV } from '@codevena/cvmake-core/loader';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runImport } from '../src/commands/import.js';

const SAMPLE = path.join(import.meta.dirname, 'fixtures', 'jsonresume.sample.json');

describe('import', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function tmpOut(): string {
    return path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-')), 'cv.yaml');
  }

  it('converts a JSON Resume into schema-valid cvmake YAML', async () => {
    const out = tmpOut();
    const code = await runImport({ input: SAMPLE, output: out, lang: 'en' });
    expect(code).toBe(0);
    expect(existsSync(out)).toBe(true);

    const data = await loadCV(out); // throws if the mapped output is invalid
    expect(data.personal.firstName).toBe('Richard');
    expect(data.personal.lastName).toBe('Hendriks');
    expect(data.personal.title).toBe('Backend Engineer');
    expect(data.personal.contacts.email).toBe('richard.hendriks@example.com');
    expect(data.personal.contacts.github).toBe('rhendriks');
    expect(data.personal.contacts.linkedin).toBe('richard-hendriks');
    expect(data.personal.contacts.location).toContain('San Francisco');
    expect(data.summary).toContain('compression');
  });

  it('maps work, education, skills, languages and extra sections', async () => {
    const out = tmpOut();
    await runImport({ input: SAMPLE, output: out, lang: 'en' });
    const data = await loadCV(out);

    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]?.title).toBe('CEO/President');
    expect(data.experience[0]?.company).toBe('Pied Piper');
    expect(data.experience[0]?.startDate).toBe('2017-06-01');
    expect(data.experience[0]?.bullets.length).toBeGreaterThan(0);

    expect(data.education[0]?.institution).toBe('Vassar College');
    expect(data.education[0]?.degree).toContain('Computer Science');

    // skills with keywords → categorized
    expect(data.skills?.categorized?.Backend).toEqual(['Go', 'PostgreSQL', 'gRPC']);

    // fluency → CEFR enum
    const byName = Object.fromEntries((data.languages ?? []).map((l) => [l.name, l.level]));
    expect(byName.English).toBe('native');
    expect(byName.Spanish).toBe('B1');

    // projects + awards → custom sections
    const ids = (data.customSections ?? []).map((s) => s.id);
    expect(ids).toContain('projects');
    expect(ids).toContain('awards');
  });

  it('supports --lang de for the output locale', async () => {
    const out = tmpOut();
    await runImport({ input: SAMPLE, output: out, lang: 'de' });
    const data = await loadCV(out);
    expect(data.meta.locale).toBe('de');
  });

  it('errors on invalid JSON input', async () => {
    const bad = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-')), 'bad.json');
    writeFileSync(bad, '{ not valid json ', 'utf8');
    expect(await runImport({ input: bad, output: tmpOut(), lang: 'en' })).toBe(1);
  });

  it('errors on a missing input file', async () => {
    expect(await runImport({ input: '/no/such/resume.json', output: tmpOut(), lang: 'en' })).toBe(
      1,
    );
  });

  it('refuses to overwrite an existing output without --force', async () => {
    const out = tmpOut();
    writeFileSync(out, 'KEEP', 'utf8');
    expect(await runImport({ input: SAMPLE, output: out, lang: 'en' })).toBe(1);
  });
});
