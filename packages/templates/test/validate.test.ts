import type { TemplateDefinition } from '@codevena/cvmake-schema';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { validateTemplate } from '../src/validate.js';

const base: TemplateDefinition = {
  meta: {
    id: 'x',
    name: 'X',
    description: 'x',
    supportsPhoto: true,
    photoFallback: 'initials',
    supportedLocales: ['de', 'en'],
    defaultSectionOrder: ['summary'],
    supportsPagination: true,
  },
  palettes: [
    {
      id: 'x-a',
      name: 'A',
      accent: '#000000',
      background: '#ffffff',
      surface: '#eeeeee',
      text: '#000000',
      textMuted: '#666666',
      textOnAccent: '#ffffff',
    },
  ],
  Component: (() => null) as unknown as (props: unknown) => ReactElement,
};

describe('validateTemplate', () => {
  it('akzeptiert valides Template', () => {
    expect(() => validateTemplate(base)).not.toThrow();
  });
  it('verbietet leere Palette-Liste', () => {
    expect(() => validateTemplate({ ...base, palettes: [] })).toThrow(/at least one palette/);
  });
  it('verbietet doppelte Palette-IDs', () => {
    const first = base.palettes[0]!;
    expect(() => validateTemplate({ ...base, palettes: [first, first] })).toThrow(
      /duplicate palette id/,
    );
  });
});
