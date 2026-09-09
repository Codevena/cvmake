import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCV } from '@codevena/cvmake-core/loader';
import { bootstrapTemplates, getTemplate } from '@codevena/cvmake-templates';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInit } from '../src/commands/init.js';

describe('init', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function tmpOut(): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'cvmake-init-'));
    return path.join(dir, 'cv.yaml');
  }

  it('scaffolds a schema-valid cv.yaml (en)', async () => {
    const out = tmpOut();
    const code = runInit({ output: out, lang: 'en' });
    expect(code).toBe(0);
    expect(existsSync(out)).toBe(true);
    const data = await loadCV(out); // throws if the starter is not schema-valid
    expect(data.meta.locale).toBe('en');
  });

  it('scaffolds a schema-valid cv.yaml (de)', async () => {
    const out = tmpOut();
    const code = runInit({ output: out, lang: 'de' });
    expect(code).toBe(0);
    const data = await loadCV(out);
    expect(data.meta.locale).toBe('de');
  });

  it('refuses to overwrite an existing file without --force', () => {
    const out = tmpOut();
    writeFileSync(out, 'KEEP', 'utf8');
    const code = runInit({ output: out, lang: 'en' });
    expect(code).toBe(1);
    expect(readFileSync(out, 'utf8')).toBe('KEEP'); // untouched
  });

  it('overwrites an existing file with --force', () => {
    const out = tmpOut();
    writeFileSync(out, 'KEEP', 'utf8');
    const code = runInit({ output: out, lang: 'en', force: true });
    expect(code).toBe(0);
    expect(readFileSync(out, 'utf8')).not.toBe('KEEP');
  });

  it('rejects an unknown language', () => {
    const out = tmpOut();
    const code = runInit({ output: out, lang: 'fr' });
    expect(code).toBe(1);
    expect(existsSync(out)).toBe(false);
  });

  // The starter file suggests a palette in a comment. If that name does not
  // exist, uncommenting it used to produce a PDF in the template's default
  // colours and exit 0 — and since `init` was never published before 0.2.0,
  // this reaches real users for the first time now.
  describe('the suggested palette exists', () => {
    it.each([['en'], ['de']] as const)('for the %s starter', async (lang) => {
      bootstrapTemplates();
      const out = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-init-pal-')), 'cv.yaml');
      expect(await runInit({ output: out, lang })).toBe(0);
      const text = readFileSync(out, 'utf8');

      const templateId = /^\s*template:\s*(\S+)/m.exec(text)?.[1];
      const suggested = /^\s*#\s*palette:\s*(\S+)/m.exec(text)?.[1];
      expect(templateId).toBeDefined();
      expect(suggested).toBeDefined();

      const tpl = getTemplate(templateId as string);
      expect(tpl).toBeDefined();
      expect(tpl?.palettes.map((p) => p.id)).toContain(suggested);
    });

    it('and the file still loads once the palette line is activated', async () => {
      const out = path.join(mkdtempSync(path.join(tmpdir(), 'cvmake-init-pal2-')), 'cv.yaml');
      await runInit({ output: out, lang: 'en' });
      const text = readFileSync(out, 'utf8').replace(/^(\s*)#\s*(palette:.*)$/m, '$1$2');
      writeFileSync(out, text, 'utf8');
      const data = await loadCV(out);
      expect(data.rendering.palette).toBeDefined();
    });
  });
});
