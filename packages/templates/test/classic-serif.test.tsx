/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fullFixture, minimalFixture } from '@codevena/forq-schema/test/fixtures.js';
import { getLabels } from '@codevena/forq-core';
import { classicSerif } from '../src/classic-serif/index.js';

const palette = classicSerif.palettes[0]!;

describe('ClassicSerifTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toContain('Alex Schmidt');
    expect(html).toContain('Berufserfahrung');
    expect(html).toContain('Codevena');
  });

  it('zeigt Initialen wenn kein Foto', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatch(/classic-serif__initials[^>]*>MW/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <classicSerif.Component
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
      <classicSerif.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
