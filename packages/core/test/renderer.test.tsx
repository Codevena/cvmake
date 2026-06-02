import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { minimalFixture } from '@codevena/cvmake-schema/fixtures';
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

  it('strippt rendering.hiddenSections vor dem Rendern (Export/CLI = Preview)', async () => {
    const tpl: TemplateDefinition = {
      ...fakeTemplate,
      Component: ({ data }) => (
        <main>
          {data.summary ? <p data-testid="summary">{data.summary}</p> : null}
          <span data-testid="exp">{data.experience.length}</span>
        </main>
      ),
    };
    const out = await renderCV({
      data: {
        meta: { locale: 'de' },
        personal: { firstName: 'A', lastName: 'B', contacts: {} },
        summary: 'SECRET_SUMMARY',
        experience: [{ title: 't', company: 'c', startDate: '2020', bullets: [] }],
        education: [],
        rendering: { template: 'fake', hiddenSections: ['summary', 'experience'] },
      },
      template: tpl,
    });
    expect(out.html).not.toContain('SECRET_SUMMARY');
    expect(out.html).toContain('data-testid="exp">0<');
  });
});
