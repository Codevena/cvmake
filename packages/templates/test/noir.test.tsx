import { getLabels } from '@codevena/cvmake-core';
import { fullFixture, minimalFixture } from '@codevena/cvmake-schema/test/fixtures.js';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { noir } from '../src/noir/index.js';

const palette = noir.palettes[0];
if (!palette) throw new Error('noir palette[0] missing');

describe('NoirTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <noir.Component data={fullFixture} palette={palette} locale="de" labels={getLabels('de')} />,
    );
    expect(html).toContain('Lena Bauer');
    expect(html).toContain('Berufserfahrung');
    expect(html).toContain('Codevena');
  });

  it('zeigt Initialen wenn kein Foto', () => {
    const html = renderToStaticMarkup(
      <noir.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatch(/noir__initials[^>]*>LB/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <noir.Component
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
      <noir.Component data={fullFixture} palette={palette} locale="de" labels={getLabels('de')} />,
    );
    expect(html).toMatchSnapshot();
  });
});
