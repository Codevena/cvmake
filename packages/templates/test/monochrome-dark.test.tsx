/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fullFixture, minimalFixture } from '@codevena/forq-schema/test/fixtures.js';
import { getLabels } from '@codevena/forq-core';
import { monochromeDark } from '../src/monochrome-dark/index.js';

const palette = monochromeDark.palettes[0]!;

describe('MonochromeDarkTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <monochromeDark.Component
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
      <monochromeDark.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatch(/monochrome-dark__initials[^>]*>MW/);
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <monochromeDark.Component
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
      <monochromeDark.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
