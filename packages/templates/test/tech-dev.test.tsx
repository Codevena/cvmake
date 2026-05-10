import { getLabels } from '@codevena/forq-core';
import { fullFixture, minimalFixture } from '@codevena/forq-schema/test/fixtures.js';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { techDev } from '../src/tech-dev/index.js';

const palette = techDev.palettes[0]!;

describe('TechDevTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <techDev.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toContain('Alex Schmidt');
    // Section headings are lowercased with "// " prefix (tech-dev style)
    expect(html).toContain('// berufserfahrung');
    // Company is rendered as hashtag in lowercase
    expect(html).toContain('#codevena');
  });

  it('zeigt Initialen wenn kein Foto', () => {
    const html = renderToStaticMarkup(
      <techDev.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatch(/tech-dev__initials[^>]*>MW/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <techDev.Component
        data={{ ...fullFixture, meta: { locale: 'en' } }}
        palette={palette}
        locale="en"
        labels={getLabels('en')}
      />,
    );
    // Section headings are lowercased with "// " prefix (tech-dev style)
    expect(html).toContain('// experience');
    expect(html).not.toContain('// berufserfahrung');
  });

  it('matched HTML-Snapshot', () => {
    const html = renderToStaticMarkup(
      <techDev.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
