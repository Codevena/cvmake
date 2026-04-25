import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { dataDir, photoDir, resolveCvPath, validateSlug } from './data-paths';

describe('validateSlug', () => {
  it('akzeptiert cv.de', () => expect(validateSlug('cv.de')).toBe('cv.de'));
  it('akzeptiert cv-en-2026', () => expect(validateSlug('cv-en-2026')).toBe('cv-en-2026'));
  it('lehnt ".." ab', () => expect(() => validateSlug('..')).toThrow());
  it('lehnt "." ab', () => expect(() => validateSlug('.')).toThrow());
  it('lehnt Großbuchstaben ab', () => expect(() => validateSlug('CV')).toThrow());
  it('lehnt Slashes ab', () => expect(() => validateSlug('a/b')).toThrow());
  it('lehnt leeren String ab', () => expect(() => validateSlug('')).toThrow());
});

describe('resolveCvPath', () => {
  it('liegt unter dataDir', () => {
    const p = resolveCvPath('cv.de');
    expect(p.startsWith(dataDir())).toBe(true);
    expect(p.endsWith(path.join('data', 'cvs', 'cv.de.yaml'))).toBe(true);
  });
  it('blockt traversal über resolve', () => {
    expect(() => resolveCvPath('..')).toThrow();
  });
});

describe('photoDir', () => {
  it('zeigt auf public/photos', () => {
    expect(photoDir().endsWith(path.join('public', 'photos'))).toBe(true);
  });
});
