import { getLabels } from '@codevena/cvmake-core';
import { fullFixture, minimalFixture } from '@codevena/cvmake-schema/fixtures';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { techDev } from '../src/tech-dev/index.js';

const [palette] = techDev.palettes;
if (!palette) throw new Error('tech-dev template must ship at least one palette');

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
    expect(html).toContain('Lena Bauer');
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
    expect(html).toMatch(/tech-dev__initials[^>]*>LB/);
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
