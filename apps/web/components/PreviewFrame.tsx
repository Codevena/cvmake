'use client';
import { cssVariables } from '@/lib/css-vars';
import type { PreviewBootstrap } from '@/lib/preview-bootstrap';
import { getLabels } from '@codevena/forq-core';
import type { CVData, ColorPalette } from '@codevena/forq-schema';
import { getTemplate } from '@codevena/forq-templates';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  data: CVData;
  bootstrap: PreviewBootstrap;
  templateId: string;
  paletteId?: string | undefined;
  accentOverride?: string | undefined;
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
  doc.write(`<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
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

export function PreviewFrame({ data, bootstrap, templateId, paletteId, accentOverride }: Props) {
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

  return (
    <>
      <iframe
        ref={iframeRef}
        title="CV Preview"
        sandbox="allow-same-origin"
        className="h-full w-full bg-white"
      />
      {root && tplDef && palette
        ? createPortal(
            <tplDef.Component
              data={data}
              palette={palette}
              locale={data.meta.locale}
              labels={getLabels(data.meta.locale)}
            />,
            root,
          )
        : null}
    </>
  );
}
