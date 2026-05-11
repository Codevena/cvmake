import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { minimalFixture } from '@codevena/cvmake-schema/test/fixtures.js';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { renderCV } from '../src/renderer.js';

const fakeTemplate: TemplateDefinition = {
  meta: {
    id: 'fake',
    name: 'Fake',
    description: 'x',
    supportsPhoto: false,
    photoFallback: 'none',
    supportedLocales: ['de', 'en'],
    defaultSectionOrder: ['summary'],
    supportsPagination: true,
  },
  palettes: [
    {
      id: 'fake-default',
      name: 'Fake Default',
      accent: '#112233',
      background: '#ffffff',
      surface: '#f1f1f1',
      text: '#000000',
      textMuted: '#666666',
      textOnAccent: '#ffffff',
    },
  ],
  Component: ({ data, labels }) => (
    <main>
      <h1>
        {data.personal.firstName} {data.personal.lastName}
      </h1>
      <p data-testid="label">{labels.experience}</p>
    </main>
  ),
};

describe('renderCV', () => {
  it('rendert HTML mit Locale-Label', async () => {
    const out = await renderCV({ data: minimalFixture, template: fakeTemplate });
    expect(out.html).toContain('<h1>Lena Bauer</h1>');
    expect(out.html).toContain('Berufserfahrung');
    expect(out.locale).toBe('de');
  });
});
