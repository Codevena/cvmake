import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { wrapHtmlDocument } from '@codevena/cvmake-core/html-document';
import { loadCV } from '@codevena/cvmake-core/loader';
import { generatePDF, shutdownPdfBrowser } from '@codevena/cvmake-core/pdf';
import { embedPhoto } from '@codevena/cvmake-core/photo-embed';
import { renderCV } from '@codevena/cvmake-core/renderer';
import { bootstrapTemplates, getTemplate } from '@codevena/cvmake-templates';
import {
  loadPrintCss,
  loadResetCss,
  loadTemplateCss,
  stripSharedImports,
} from '@codevena/cvmake-templates/css';
import pc from 'picocolors';

export interface BuildArgs {
  yaml: string;
  template?: string | undefined;
  palette?: string | undefined;
  output: string;
}

export async function runBuild(args: BuildArgs): Promise<void> {
  bootstrapTemplates();
  const rawData = await loadCV(args.yaml);
  const baseDir = path.dirname(path.resolve(args.yaml));
  const data = await embedPhoto(rawData, baseDir);
  const templateId = args.template ?? data.rendering.template;
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`unknown template: ${templateId}`);
  }
  // Validate an explicitly-passed --palette instead of silently falling back to
  // the default palette (which would produce a PDF in the wrong colours, exit 0).
  if (args.palette !== undefined && !template.palettes.some((p) => p.id === args.palette)) {
    throw new Error(
      `unknown palette: ${args.palette} (template '${templateId}' has: ${template.palettes
        .map((p) => p.id)
        .join(', ')})`,
    );
  }
  const paletteId = args.palette ?? data.rendering.palette;
  const rendered = await renderCV({
    data,
    template,
    ...(paletteId !== undefined ? { paletteId } : {}),
  });
  // The template's styles.css starts with relative `@import "../shared/..."`
  // lines that cannot resolve under Puppeteer's setContent (no base URL). Load
  // the shared reset/print CSS explicitly and strip the dead @imports, then
  // order reset → template → print → palette-vars (mirrors the web preview).
  const resetCss = loadResetCss();
  const printCss = loadPrintCss();
  let templateCss = '';
  try {
    templateCss = stripSharedImports(loadTemplateCss(templateId));
  } catch {
    // Template ships without dedicated styles.css — fall back to shared + renderer output only.
  }
  const css = `${resetCss}\n${templateCss}\n${printCss}\n${rendered.css}`;
  const html = wrapHtmlDocument({
    title: `${data.personal.firstName} ${data.personal.lastName} — CV`,
    html: rendered.html,
    css,
    lang: rendered.locale,
  });
  const pdf = await generatePDF(html);
  const outPath = path.resolve(args.output);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, pdf);
  await shutdownPdfBrowser();
  console.warn(pc.green(`✓ wrote ${outPath} (${pdf.byteLength} bytes)`));
}

export async function runBuildAll(dir: string, outDir: string): Promise<void> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  await mkdir(outDir, { recursive: true });
  for (const f of files) {
    const yaml = path.join(dir, f);
    const output = path.join(outDir, f.replace(/\.(yaml|yml)$/, '.pdf'));
    await runBuild({ yaml, output });
  }
}
