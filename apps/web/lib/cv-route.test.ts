import { describe, expect, it } from 'vitest';
import { cvRoute } from './cv-route';

describe('cvRoute', () => {
  it('uses the /cv/<slug> route when not in demo mode', () => {
    expect(cvRoute('cv.de', false)).toBe('/cv/cv.de');
  });

  it('uses a ?slug= query param in demo mode', () => {
    expect(cvRoute('example.de', true)).toBe('/?slug=example.de');
  });

  it('encodes the slug in both modes', () => {
    expect(cvRoute('a b', false)).toBe('/cv/a%20b');
    expect(cvRoute('a b', true)).toBe('/?slug=a%20b');
  });
});
