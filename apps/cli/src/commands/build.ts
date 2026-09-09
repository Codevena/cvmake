import { statSync } from 'node:fs';
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

/**
 * Do two paths address the same file on disk?
 *
 * Compared by device + inode rather than by string, because every string-based
 * comparison misses a case this one catches: a case-only spelling on a
 * case-insensitive filesystem (`-o CV.YAML` for `cv.yaml` — macOS keeps the
 * caller's casing even through `fs.realpathSync`), a symlink pointing back at
 * the input, and a hard link, which no path canonicalisation can detect at all.
 *
 * A missing file is not the same file, so a non-existent output is fine — that
 * is the normal case. Every OTHER stat error is rethrown: swallowing EACCES,
 * EPERM, ELOOP or ENOTDIR here would silently switch the guard off in exactly
 * the situations where the filesystem is behaving oddly, and the failure mode
 * of this guard is a destroyed CV.
 */
function isSameFile(a: string, b: string): boolean {
  const stat = (p: string) => {
    try {
      return statSync(p);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw err;
    }
  };
  const sa = stat(a);
  const sb = stat(b);
  if (!sa || !sb) return false;
  return sa.dev === sb.dev && sa.ino === sb.ino;
}

export async function runBuild(args: BuildArgs): Promise<void> {
  // Checked before anything expensive runs: `cvmake build cv.yaml -o cv.yaml`
  // used to render a full PDF and then overwrite the source YAML with its
  // bytes, destroying the input irrecoverably.
  if (isSameFile(args.yaml, path.resolve(args.output))) {
    throw new Error(
      `refusing to overwrite the input file: ${args.yaml} and ${args.output} are the same file. Choose a different -o/--output path.`,
    );
  }
  bootstrapTemplates();
  const rawData = await loadCV(args.yaml);
  const baseDir = path.dirname(path.resolve(args.yaml));
  const data = await embedPhoto(rawData, baseDir);
  const templateId = args.template ?? data.rendering.template;
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`unknown template: ${templateId}`);
  }
  // Validate the palette that will actually be used, not just the flag. renderCV
  // falls back to `palettes[0]` for an unknown id, so an outdated
  // `rendering.palette` in the YAML used to produce a PDF in the wrong colours
  // and exit 0 — the same defect this check was written for, reached by the
  // other route. The message names where the value came from, or the user goes
  // looking for a flag they never typed.
  const paletteId = args.palette ?? data.rendering.palette;
  const paletteKnown = paletteId === undefined || template.palettes.some((p) => p.id === paletteId);
  // Whether an unusable palette is an error depends on who caused the mismatch.
  // Overriding the template on the command line makes the file's own palette
  // inapplicable through no fault of the file — that combination gets a note
  // and the template's default. An explicit --palette, or a palette the YAML
  // pairs with its OWN template, is a request that cannot be honoured: renderCV
  // would silently fall back to palettes[0] and exit 0 with the wrong colours,
  // which is the defect this guards.
  // The note applies only when the palette was fine for the file's OWN template
  // and became inapplicable through the override. A palette that does not exist
  // in either template is a defect in the file, and downgrading it would both
  // hide that and blame `--template` for something it did not cause.
  const ownTemplate = getTemplate(data.rendering.template);
  const validForOwnTemplate =
    paletteId !== undefined && (ownTemplate?.palettes.some((p) => p.id === paletteId) ?? false);
  const overrideCausedMismatch =
    args.template !== undefined && args.template !== data.rendering.template && validForOwnTemplate;
  if (!paletteKnown) {
    const names = template.palettes.map((p) => p.id).join(', ');
    if (args.palette === undefined && overrideCausedMismatch) {
      console.warn(
        pc.yellow(
          `  note: palette '${paletteId}' does not exist in template '${templateId}' (from --template); using ${template.palettes[0]?.id}`,
        ),
      );
    } else {
      const origin = args.palette !== undefined ? '--palette' : 'cv.yaml `rendering.palette`';
      throw new Error(
        `unknown palette: ${paletteId} (from ${origin}; template '${templateId}' has: ${names})`,
      );
    }
  }
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
