import { bootstrapTemplates, listTemplates } from '@codevena/cvmake-templates';
import { beforeAll, describe, expect, it } from 'vitest';
import { getPreviewBootstrap } from './preview-bootstrap';

/**
 * This object is a prop on `EditorShell`, which is a client component, so all
 * of it is serialised into every editor page load.
 *
 * It once carried the vendored `@font-face` blocks for all twelve templates.
 * Measured then: 2 218 957 bytes, of which 56 818 was real CSS — a 37×
 * page-weight regression on the public demo, eleven twelfths of it typefaces
 * for templates the viewer was not looking at. The preview fetches the one it
 * needs from `/template-fonts/<id>.css` instead.
 */
describe('getPreviewBootstrap', () => {
  beforeAll(() => bootstrapTemplates());

  it('returns resetCss and printCss as non-empty strings', () => {
    const b = getPreviewBootstrap();
    expect(b.resetCss.length).toBeGreaterThan(0);
    expect(b.printCss.length).toBeGreaterThan(0);
  });

  it('returns a CSS string and meta for every registered template', () => {
    const b = getPreviewBootstrap();
    for (const t of listTemplates()) {
      const entry = b.templates[t.meta.id];
      expect(entry).toBeDefined();
      expect(entry?.css.length).toBeGreaterThan(0);
      expect(entry?.meta.id).toBe(t.meta.id);
    }
  });
});

describe('the preview bootstrap payload', () => {
  // Without this the registry is empty, `templates` is `{}`, and the two size
  // assertions below pass against nothing at all — which is exactly what
  // happened on the first run, and what the third case is here to catch.
  beforeAll(() => bootstrapTemplates());

  it('carries no embedded font data', () => {
    const json = JSON.stringify(getPreviewBootstrap());
    expect(json).not.toContain('@font-face');
    expect(json).not.toContain('data:font/woff2');
  });

  it('stays far below the size that made it a regression', () => {
    const bytes = Buffer.byteLength(JSON.stringify(getPreviewBootstrap()), 'utf8');
    // ~57 KB today. The ceiling is deliberately loose enough that ordinary CSS
    // edits do not trip it, and far below the 2.1 MB it reached — anything in
    // between means fonts came back in.
    expect(bytes).toBeLessThan(300_000);
  });

  it('still carries every template’s stylesheet', () => {
    // The counter-probe: the fix is "no fonts here", not "less here". If the
    // stylesheets went missing too, switching templates in the editor would
    // render unstyled and the two assertions above would still pass.
    const b = getPreviewBootstrap();
    expect(Object.keys(b.templates).length).toBeGreaterThanOrEqual(12);
    expect(b.resetCss.length).toBeGreaterThan(0);
    expect(b.printCss.length).toBeGreaterThan(0);
    for (const [id, entry] of Object.entries(b.templates)) {
      expect(entry.css.length, `${id} has no stylesheet`).toBeGreaterThan(0);
    }
  });
});
