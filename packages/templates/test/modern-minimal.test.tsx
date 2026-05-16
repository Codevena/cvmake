import { getLabels } from '@codevena/cvmake-core';
import { fullFixture, minimalFixture } from '@codevena/cvmake-schema/fixtures';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { modernMinimal } from '../src/modern-minimal/index.js';

const [palette] = modernMinimal.palettes;
if (!palette) throw new Error('modern-minimal template must ship at least one palette');

describe('ModernMinimalTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <modernMinimal.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toContain('Lena Bauer');
    expect(html).toContain('Codevena');
    expect(html).toContain('Berufserfahrung');
  });

  it('zeigt Initialen wenn kein Foto', () => {
    const html = renderToStaticMarkup(
      <modernMinimal.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatch(/modern-minimal__initials[^>]*>LB/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <modernMinimal.Component
        data={{ ...fullFixture, meta: { locale: 'en' } }}
        palette={palette}
        locale="en"
        labels={getLabels('en')}
      />,
    );
    expect(html).toContain('Experience');
    expect(html).not.toContain('Berufserfahrung');
  });

  it('matched HTML-Snapshot', () => {
    const html = renderToStaticMarkup(
      <modernMinimal.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
