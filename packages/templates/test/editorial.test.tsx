import { getLabels } from '@codevena/forq-core';
import { fullFixture, minimalFixture } from '@codevena/forq-schema/test/fixtures.js';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
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
    expect(html).toContain('Markus Wiesecke');
    expect(html).toContain('Berufserfahrung');
    expect(html).toContain('Codevena');
  });

  it('zeigt Masthead-Foto wenn vorhanden, sonst Akzent-Bar', () => {
    const htmlWithPhoto = renderToStaticMarkup(
      <editorial.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(htmlWithPhoto).toContain('editorial__masthead--with-photo');
    expect(htmlWithPhoto).toContain('editorial__masthead-img');
    expect(htmlWithPhoto).not.toContain('editorial__masthead--no-photo');
    expect(htmlWithPhoto).not.toContain('editorial__masthead-bar');

    const htmlNoPhoto = renderToStaticMarkup(
      <editorial.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(htmlNoPhoto).toContain('editorial__masthead--no-photo');
    expect(htmlNoPhoto).toContain('editorial__masthead-bar');
    expect(htmlNoPhoto).not.toContain('editorial__masthead--with-photo');
    expect(htmlNoPhoto).not.toContain('editorial__masthead-img');
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
