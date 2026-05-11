import { getLabels } from '@codevena/cvmake-core';
import { fullFixture, minimalFixture } from '@codevena/cvmake-schema/test/fixtures.js';
import { renderToStaticMarkup } from 'react-dom/server';
/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { academic } from '../src/academic/index.js';

const palette = academic.palettes[0]!;

describe('AcademicTemplate', () => {
  it('rendert Voll-Fixture ohne Fehler', () => {
    const html = renderToStaticMarkup(
      <academic.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toContain('Lena Bauer');
    expect(html).toContain('Berufserfahrung');
    expect(html).toContain('Codevena');
    expect(html).toContain('academic__section-title');
  });

  it('rendert Minimal-Fixture ohne Foto und ohne Initialen', () => {
    const html = renderToStaticMarkup(
      <academic.Component
        data={minimalFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toContain('Lena Bauer');
    // No photo rendering — supportsPhoto=false, no initials div either
    expect(html).not.toContain('academic__photo');
    expect(html).not.toContain('academic__initials');
    // Header contains the name
    expect(html).toContain('academic__name');
  });

  it('rendert EN-Labels bei locale=en', () => {
    const html = renderToStaticMarkup(
      <academic.Component
        data={{ ...fullFixture, meta: { locale: 'en' } }}
        palette={palette}
        locale="en"
        labels={getLabels('en')}
      />,
    );
    expect(html).toContain('Experience');
    expect(html).not.toContain('Berufserfahrung');
    expect(html).toContain('Education');
  });

  it('matched HTML-Snapshot', () => {
    const html = renderToStaticMarkup(
      <academic.Component
        data={fullFixture}
        palette={palette}
        locale="de"
        labels={getLabels('de')}
      />,
    );
    expect(html).toMatchSnapshot();
  });
});
