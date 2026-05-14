'use client';
import { cssVariables } from '@/lib/css-vars';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import { applyHiddenSections } from '@/lib/render-helpers';
import { getLabels } from '@codevena/cvmake-core/i18n';
import type { CVData, ColorPalette } from '@codevena/cvmake-schema';
import { getTemplate } from '@codevena/cvmake-templates';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: CVData;
  bootstrap: PreviewBootstrap;
  templateId: string;
  paletteId?: string | undefined;
  accentOverride?: string | undefined;
  rendering?: boolean;
}

function effectivePalette(
  _bootstrap: PreviewBootstrap,
  templateId: string,
  paletteId: string | undefined,
  accentOverride: string | undefined,
): ColorPalette | null {
  const t = getTemplate(templateId);
  if (!t) return null;
  const pal = t.palettes.find((p) => p.id === paletteId) ?? t.palettes[0];
  if (!pal) return null;
  return { ...pal, accent: accentOverride ?? pal.accent };
}

function writeInitialDoc(
  iframe: HTMLIFrameElement,
  bootstrap: PreviewBootstrap,
  templateId: string,
  paletteVars: string,
  locale: string,
): HTMLElement | null {
  const tpl = bootstrap.templates[templateId];
  if (!tpl) return null;
  const doc = iframe.contentDocument;
  if (!doc) return null;
  doc.open();
  // <base href="/cv/"> makes relative photo paths from the YAML
  // (e.g. `photos/example-adam.webp`) resolve to `/cv/photos/...`, where
  // the editor serves fixture photos, regardless of the editor's own URL
  // (`/` in demo mode, `/cv/<slug>` otherwise). Absolute upload URLs
  // (`/photos/<slug>.webp`) ignore <base> and keep resolving as-is.
  doc.write(`<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<base href="/cv/">
<style id="reset-css">${bootstrap.resetCss}</style>
<style id="template-css">${tpl.css}</style>
<style id="print-css">${bootstrap.printCss}</style>
<style id="palette-vars">${paletteVars}</style>
</head>
<body><div id="cv-root"></div></body>
</html>`);
  doc.close();
  return doc.getElementById('cv-root');
}

export function PreviewFrame({
  data,
  bootstrap,
  templateId,
  paletteId,
  accentOverride,
  rendering,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const lastTemplateRef = useRef<string | null>(null);

  // Build / rebuild iframe document on template change. We intentionally exclude
  // `paletteId` and `accentOverride` from deps — palette-only changes are
  // patched in-place by the second effect (textContent of <style id="palette-vars">),
  // avoiding a full document rewrite per design.
  // biome-ignore lint/correctness/useExhaustiveDependencies: paletteId/accentOverride deliberately omitted; handled by palette-patch effect below
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const palette = effectivePalette(bootstrap, templateId, paletteId, accentOverride);
    if (!palette) return;
    const newRoot = writeInitialDoc(
      iframe,
      bootstrap,
      templateId,
      cssVariables(palette),
      data.meta.locale,
    );
    lastTemplateRef.current = templateId;
    setRoot(newRoot);
  }, [templateId, bootstrap, data.meta.locale]);

  // Patch palette vars without rebuild
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || lastTemplateRef.current !== templateId) return;
    const palette = effectivePalette(bootstrap, templateId, paletteId, accentOverride);
    if (!palette) return;
    const styleEl = iframe.contentDocument?.getElementById('palette-vars');
    if (styleEl) styleEl.textContent = cssVariables(palette);
  }, [paletteId, accentOverride, templateId, bootstrap]);

  const tplDef = getTemplate(templateId);
  const palette = effectivePalette(bootstrap, templateId, paletteId, accentOverride);
  const filtered = applyHiddenSections(data);

  return (
    <div className="relative h-full overflow-auto bg-bg p-6">
      <iframe
        ref={iframeRef}
        title="CV Preview"
        sandbox="allow-same-origin"
        className="mx-auto block h-full w-full max-w-3xl rounded-md bg-white shadow-card"
      />
      {rendering && (
        <div
          data-testid="preview-rendering"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="flex gap-1.5 rounded-full bg-surface/90 px-3 py-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
          </div>
        </div>
      )}
      {root && tplDef && palette
        ? createPortal(
            <tplDef.Component
              data={filtered}
              palette={palette}
              locale={data.meta.locale}
              labels={getLabels(data.meta.locale)}
            />,
            root,
          )
        : null}
    </div>
  );
}
