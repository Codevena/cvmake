import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  embedPhoto,
  generatePDF,
  loadCV,
  renderCV,
  shutdownPdfBrowser,
  wrapHtmlDocument,
} from '@codevena/forq-core';
import { bootstrapTemplates, getTemplate } from '@codevena/forq-templates';
import { loadTemplateCss } from '@codevena/forq-templates/css';
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
  const paletteId = args.palette ?? data.rendering.palette;
  const rendered = await renderCV({
    data,
    template,
    ...(paletteId !== undefined ? { paletteId } : {}),
  });
  let templateCss = '';
  try {
    templateCss = loadTemplateCss(templateId);
  } catch {
    // Template ships without dedicated styles.css — fall back to renderer output only.
  }
  const css = `${rendered.css}\n${templateCss}`;
  const html = wrapHtmlDocument({
    title: `${data.personal.firstName} ${data.personal.lastName} — CV`,
    html: rendered.html,
    css,
  });
  const pdf = await generatePDF(html);
  const outPath = path.resolve(args.output);
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
