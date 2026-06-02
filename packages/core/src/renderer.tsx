import { applyHiddenSections } from './hidden-sections.js';
import { getLabels } from './i18n.js';
import type { RenderInput, RenderOutput } from './renderer-types.js';

export async function renderCV({ data, template, paletteId }: RenderInput): Promise<RenderOutput> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const palette = template.palettes.find((p) => p.id === paletteId) ?? template.palettes[0];
  if (!palette) throw new Error(`template ${template.meta.id} has no palettes`);
  // Strip sections the user marked hidden BEFORE rendering, so the PDF export
  // and CLI honour `rendering.hiddenSections` exactly like the live preview.
  // Idempotent, so double-application (e.g. if a caller already stripped) is safe.
  const visible = applyHiddenSections(data);
  const accent = visible.rendering.accentOverride ?? palette.accent;
  const effectivePalette = { ...palette, accent };
  const labels = getLabels(visible.meta.locale);

  const html = renderToStaticMarkup(
    <template.Component
      data={visible}
      palette={effectivePalette}
      locale={visible.meta.locale}
      labels={labels}
    />,
  );

  const css = cssVariables(effectivePalette);
  return { html, css, locale: visible.meta.locale };
}

function cssVariables(p: {
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
}) {
  return `:root{--accent:${p.accent};--bg:${p.background};--surface:${p.surface};--text:${p.text};--text-muted:${p.textMuted};--text-on-accent:${p.textOnAccent};}`;
}
