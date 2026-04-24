/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fullFixture, minimalFixture } from '@cvmake/schema/test/fixtures.js';
import { getLabels } from '@cvmake/core';
import { editorial } from '../src/editorial/index.js';

const palette = editorial.palettes[0]!;

describe('EditorialTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <editorial.Component
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

  it('zeigt Held-Foto wenn vorhanden, sonst Akzent-Bar', () => {
    const htmlWithPhoto = renderToStaticMarkup(
      <editorial.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(htmlWithPhoto).toContain('editorial__hero-img');
    expect(htmlWithPhoto).not.toContain('editorial__hero-bar');

    const htmlNoPhoto = renderToStaticMarkup(
      <editorial.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(htmlNoPhoto).toContain('editorial__hero-bar');
    expect(htmlNoPhoto).not.toContain('editorial__hero-img');
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <editorial.Component
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
      <editorial.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
