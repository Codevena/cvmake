import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadTemplateCss } from '../src/css.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/**
 * Seven templates used to name Inter, Crimson Pro, Fraunces, Source Sans Pro,
 * Cormorant Garamond and JetBrains Mono in their `font-family` and load them
 * through an `@import`. No PDF ever got them:
 * CSS drops an `@import` that is not the first rule, and every render path puts
 * the shared reset in front. The typefaces were advertised and never delivered,
 * and once the renderer was cut off from the network they could not have been
 * fetched anyway.
 *
 * They are vendored now — latin subset, embedded as `data:` URIs, so the rule
 * order cannot drop them and no request leaves the process. These tests guard
 * the three ways that arrangement can rot without anything else noticing.
 */
const withFonts = readdirSync(SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((id) => {
    try {
      readFileSync(path.join(SRC, id, 'fonts.css'));
      return true;
    } catch {
      return false;
    }
  })
  .sort();

describe('vendored template fonts', () => {
  it('are shipped by seven templates', () => {
    // Pins the set, so adding a fonts.css without wiring it up shows here
    // rather than as a PDF that quietly renders in Helvetica. It does NOT
    // cover packaging: `loadTemplateCss` resolves into `src` under vitest, so
    // a build that failed to copy .css into `dist` would be invisible to every
    // case in this file.
    expect(withFonts).toEqual([
      'academic',
      'creative-accent',
      'editorial',
      'modern-minimal',
      'monochrome-dark',
      'noir',
      'tech-dev',
    ]);
  });

  /**
   * The other direction, and the one the whole change is about: a template that
   * NAMES a typeface nobody ships renders in a fallback, silently, with exit 0.
   * Every case above walks fonts.css → styles.css and cannot see it.
   *
   * A family listed here is deliberately not vendored, and the reason has to be
   * a real one. Adding a name to this list is the visible cost of leaving a
   * template on fallbacks — which is the point: it is a decision, not an
   * oversight that grows quietly.
   */
  const NOT_VENDORED: Record<string, string> = {
    // Genuinely present on essentially every target platform.
    Arial: 'system',
    Helvetica: 'system',
    'Helvetica Neue': 'system',
    Georgia: 'system',
    'Times New Roman': 'system',
    'Trebuchet MS': 'system',
    'Courier New': 'system',
    Garamond: 'system',
    Didot: 'system (macOS)',
    'Bodoni MT': 'system (Windows/Office)',
    // Not redistributable: Futura is licensed commercially, Avenir Next ships
    // with macOS. Neither can be vendored, so bauhaus is a fallback stack by
    // necessity and its first two names are decoration on most machines.
    Futura: 'commercial licence — cannot be redistributed',
    'Avenir Next': 'bundled with macOS — cannot be redistributed',
    // Redistributable (OFL) and NOT yet vendored. classic-serif is the template
    // `cvmake init` writes, so this is the first PDF a new user makes and it
    // renders in Times/DejaVu today. Vendoring both costs roughly another
    // 0.5 MB in the published package and in every editor page load, which is
    // why it is a decision rather than a silent addition.
    'EB Garamond': 'OFL, not vendored yet — see review-todo.md',
    'Playfair Display': 'OFL, not vendored yet — see review-todo.md',
    'Cormorant Garamond': 'OFL, vendored for noir only — see review-todo.md',
  };

  const templateDirs = readdirSync(SRC, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'shared' && e.name !== 'utils')
    .map((e) => e.name)
    .sort();

  it.each(templateDirs)('%s: every family it names is either shipped or listed', (id) => {
    let styles: string;
    try {
      styles = readFileSync(path.join(SRC, id, 'styles.css'), 'utf8');
    } catch {
      return; // template ships no stylesheet of its own
    }
    let fonts = '';
    try {
      fonts = readFileSync(path.join(SRC, id, 'fonts.css'), 'utf8');
    } catch {
      /* system fonts only */
    }
    const named = new Set(
      [...styles.matchAll(/font-family:\s*([^;}]+)/g)]
        .flatMap((m) => (m[1] ?? '').split(','))
        .map((part) => part.trim().replace(/^["']|["']$/g, ''))
        // CSS generic families and the platform keywords are names for
        // "whatever this machine has", not typefaces anyone could ship.
        .filter(
          (n) =>
            n !== '' &&
            !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|math|emoji|fangsong|inherit|initial|unset|-apple-system|BlinkMacSystemFont|var\()/.test(
              n,
            ),
        ),
    );
    for (const family of named) {
      const shipped = fonts.includes(`"${family}"`);
      expect(
        shipped || family in NOT_VENDORED,
        `${id}/styles.css names "${family}", which is neither shipped in ${id}/fonts.css nor listed in NOT_VENDORED with a reason`,
      ).toBe(true);
    }
  });

  it.each(withFonts)('%s: loadTemplateCss puts the @font-face rules in the sheet', (id) => {
    const css = loadTemplateCss(id);
    expect(css).toContain('@font-face');
    // Nothing but comments precedes the first face. Not because @font-face
    // needs to be first — it does not, which is exactly why it replaced the
    // @import — but because it shows loadTemplateCss prepended the vendored
    // file rather than the template merely mentioning a face somewhere.
    expect(css.slice(0, css.indexOf('@font-face'))).not.toContain('{');
  });

  it.each(withFonts)('%s: every face is embedded, none is fetched', (id) => {
    const css = readFileSync(path.join(SRC, id, 'fonts.css'), 'utf8');
    const faces = css.match(/@font-face/g) ?? [];
    const embedded = css.match(/src:\s*url\(data:font\/woff2;base64,/g) ?? [];
    // Count, never the sheet: an assertion that embeds `css` prints megabytes
    // of base64 into the runner output on failure and buries every other result.
    expect(faces.length).toBeGreaterThan(0);
    // One embedded source per face — a face whose src went missing would fall
    // back to a system font for that weight only, which no snapshot catches.
    expect(embedded.length).toBe(faces.length);
    // The egress guard. A single remote src would reintroduce exactly the
    // request the renderer's network policy exists to refuse, and the PDF would
    // silently lose that weight instead of failing.
    expect(/url\(\s*['"]?https?:/i.test(css), `${id}/fonts.css fetches a remote font`).toBe(false);
    // The at-rule, not the word: the file's own header comment explains why
    // @import was abandoned, and matching that text would fail every run.
    expect(/^\s*@import/m.test(css), `${id}/fonts.css uses @import`).toBe(false);
  });

  it.each(withFonts)('%s: every embedded family is actually used by the template', (id) => {
    const fonts = readFileSync(path.join(SRC, id, 'fonts.css'), 'utf8');
    const styles = readFileSync(path.join(SRC, id, 'styles.css'), 'utf8');
    const families = [...fonts.matchAll(/font-family:\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(families.length).toBeGreaterThan(0);
    for (const family of new Set(families)) {
      // Guards the other direction: 2.1 MB of base64 is worth carrying only for
      // faces the template names. A renamed family in styles.css leaves the
      // bytes in the package and the text in Helvetica.
      expect(styles.includes(family as string), `${id}/styles.css never names ${family}`).toBe(
        true,
      );
    }
  });
});
