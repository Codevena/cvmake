import { writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import pc from 'picocolors';
import {
  generatePDF,
  loadCV,
  renderCV,
  wrapHtmlDocument,
  shutdownPdfBrowser,
} from '@cvmake/core';
import { bootstrapTemplates, getTemplate } from '@cvmake/templates';

export interface BuildArgs {
  yaml: string;
  template?: string | undefined;
  palette?: string | undefined;
  output: string;
}

export async function runBuild(args: BuildArgs): Promise<void> {
  bootstrapTemplates();
  const data = await loadCV(args.yaml);
  const templateId = args.template ?? data.rendering.template;
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`unknown template: ${templateId}`);
  }
  const paletteId = args.palette ?? data.rendering.palette;
  const rendered = renderCV({
    data,
    template,
    ...(paletteId !== undefined ? { paletteId } : {}),
  });
  const css = `${rendered.css}\n${(template as unknown as { css?: string }).css ?? ''}`;
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
