import { describe, expect, it } from 'vitest';
import { ColorPaletteSchema } from '../src/template.js';

describe('ColorPaletteSchema', () => {
  it('akzeptiert gültige Palette', () => {
    expect(() =>
      ColorPaletteSchema.parse({
        id: 'classic-grey',
        name: 'Classic Grey',
        accent: '#7a8894',
        background: '#ffffff',
        surface: '#f4f4f5',
        text: '#0f172a',
        textMuted: '#64748b',
        textOnAccent: '#ffffff',
      }),
    ).not.toThrow();
  });

  it('verbietet Hex ohne #', () => {
    expect(() =>
      ColorPaletteSchema.parse({
        id: 'x',
        name: 'X',
        accent: '7a8894',
        background: '#ffffff',
        surface: '#ffffff',
        text: '#000000',
        textMuted: '#000000',
        textOnAccent: '#ffffff',
      }),
    ).toThrow();
  });
});
