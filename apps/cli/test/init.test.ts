import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadCV } from '@codevena/cvmake-core/loader';
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
});
