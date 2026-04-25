import { bootstrapTemplates, listTemplates } from '@codevena/forq-templates';
import { describe, expect, it } from 'vitest';
import { getPreviewBootstrap } from './preview-bootstrap';

describe('getPreviewBootstrap', () => {
  it('liefert resetCss + printCss als nicht-leere Strings', () => {
    bootstrapTemplates();
    const b = getPreviewBootstrap();
    expect(b.resetCss.length).toBeGreaterThan(0);
    expect(b.printCss.length).toBeGreaterThan(0);
  });
  it('liefert für jedes registrierte Template ein CSS-String + meta', () => {
    bootstrapTemplates();
    const b = getPreviewBootstrap();
    for (const t of listTemplates()) {
      const entry = b.templates[t.meta.id];
      expect(entry).toBeDefined();
      expect(entry?.css.length).toBeGreaterThan(0);
      expect(entry?.meta.id).toBe(t.meta.id);
    }
  });
});
