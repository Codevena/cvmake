import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

  it('does not emit a date the schema will reject one step later', async () => {
    // A JSON Resume saying 2021-02-31 used to be copied through verbatim. The
    // importer then reported success and `cvmake build` failed on the file it
    // had just written — the worst place to find out, because the user has
    // already been told it worked. The day is dropped and the month kept,
    // which is the part that is certainly true.
    const src = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-src-')), 'resume.json');
    writeFileSync(
      src,
      JSON.stringify({
        basics: { name: 'A B' },
        work: [{ name: 'Acme', position: 'Dev', startDate: '2021-02-31', endDate: '2023-04-31' }],
      }),
    );
    const out = tmpOut();
    expect(await runImport({ input: src, output: out, lang: 'en' })).toBe(0);
    // loadCV runs the schema — this throws if the importer wrote an unloadable
    // file, which is exactly the regression.
    const data = await loadCV(out);
    expect(data.experience[0]?.startDate).toBe('2021-02');
    expect(data.experience[0]?.endDate).toBe('2023-04');
  });

  it('keeps a real day when there is one', async () => {
    // The counter-probe. Without it, an importer that threw every day away
    // would pass the case above.
    const src = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-src-')), 'resume.json');
    writeFileSync(
      src,
      JSON.stringify({
        basics: { name: 'A B' },
        work: [{ name: 'Acme', position: 'Dev', startDate: '2024-02-29', endDate: '2024-03-15' }],
      }),
    );
    const out = tmpOut();
    expect(await runImport({ input: src, output: out, lang: 'en' })).toBe(0);
    const data = await loadCV(out);
    expect(data.experience[0]?.startDate).toBe('2024-02-29');
    expect(data.experience[0]?.endDate).toBe('2024-03-15');
  });

  // The photo mapping has two directions and both need a number. The suite
  // already covers the refusal (the sample fixture carries a remote image and
  // the output must not contain it); without the two cases below, a safePhoto
  // that drops EVERY photo passes the whole suite.
  it('keeps a local image path', async () => {
    const local = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-src-')), 'resume.json');
    writeFileSync(
      local,
      JSON.stringify({ basics: { name: 'A B', image: 'photos/me.jpg' }, work: [], education: [] }),
      'utf8',
    );
    const out = tmpOut();
    expect(await runImport({ input: local, output: out, lang: 'en' })).toBe(0);
    const data = await loadCV(out);
    expect(data.personal.photo).toBe('photos/me.jpg');
  });

  it('keeps an embedded data:image photo', async () => {
    const embedded = 'data:image/png;base64,AAAA';
    const src = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-src-')), 'resume.json');
    writeFileSync(
      src,
      JSON.stringify({ basics: { name: 'A B', image: embedded }, work: [], education: [] }),
      'utf8',
    );
    const out = tmpOut();
    expect(await runImport({ input: src, output: out, lang: 'en' })).toBe(0);
    const data = await loadCV(out);
    expect(data.personal.photo).toBe(embedded);
  });

  it('drops a data URI carrying a newline, and does not call it remote', async () => {
    // This shape reaches the drop path only because the control-character
    // rules run before the data: branch. It must produce a document the schema
    // accepts, and a note that describes what actually happened.
    const src = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-src-')), 'resume.json');
    const wrapped = 'data:image/png;base64,AAAA\nBBBB';
    writeFileSync(
      src,
      JSON.stringify({ basics: { name: 'A B', image: wrapped }, work: [], education: [] }),
      'utf8',
    );
    const out = tmpOut();
    expect(await runImport({ input: src, output: out, lang: 'en' })).toBe(0);
    const data = await loadCV(out); // throws if the output does not validate
    expect(data.personal.photo).toBeUndefined();

    const notes = (console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(notes).toContain('dropped the photo value');
    expect(notes).not.toContain('remote photo');
  });

  it('truncates a long dropped value instead of printing all of it', async () => {
    // A data: URI is routinely tens of kilobytes; the note must stay readable.
    const src = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-import-src-')), 'resume.json');
    const huge = `https://example.com/${'x'.repeat(5000)}.jpg`;
    writeFileSync(
      src,
      JSON.stringify({ basics: { name: 'A B', image: huge }, work: [], education: [] }),
      'utf8',
    );
    await runImport({ input: src, output: tmpOut(), lang: 'en' });
    const notes = (console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(notes).toContain('dropped the remote photo');
    expect(notes).not.toContain('x'.repeat(200));
    expect(notes.length).toBeLessThan(1000);
  });

  it('drops the remote image of the sample fixture and says so', async () => {
    const out = tmpOut();
    await runImport({ input: SAMPLE, output: out, lang: 'en' });
    const data = await loadCV(out);
    expect(data.personal.photo).toBeUndefined();
    expect(readFileSync(out, 'utf8')).not.toContain('example.com/richard.jpg');
    // A photo that disappears without a word is the failure mode this note
    // exists to prevent, so the note is asserted rather than assumed.
    const notes = (console.warn as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(notes).toContain('dropped the remote photo');
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
