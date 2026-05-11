import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { listTemplates } from '@codevena/cvmake-templates';

export interface PreviewBootstrapTemplateEntry {
  css: string;
  meta: TemplateDefinition['meta'];
}

export interface PreviewBootstrap {
  resetCss: string;
  printCss: string;
  templates: Record<string, PreviewBootstrapTemplateEntry>;
}

function templatesPkgRoot(): string {
  // Prefer resolving relative to this module so tests + Next.js builds both work
  // regardless of cwd. Falls back to process.cwd() (workspace root) if the
  // module URL points into a bundler-rewritten location.
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // apps/web/lib -> ../../packages/templates/src
    const candidate = path.resolve(here, '..', '..', '..', 'packages', 'templates', 'src');
    return candidate;
  } catch {
    return path.resolve(process.cwd(), 'packages', 'templates', 'src');
  }
}

let cached: PreviewBootstrap | null = null;

export function getPreviewBootstrap(): PreviewBootstrap {
  if (cached) return cached;
  const root = templatesPkgRoot();
  const resetCss = readFileSync(path.join(root, 'shared', 'reset.css'), 'utf8');
  const printCss = readFileSync(path.join(root, 'shared', 'print.css'), 'utf8');
  const templates: PreviewBootstrap['templates'] = {};
  for (const t of listTemplates()) {
    const cssPath = path.join(root, t.meta.id, 'styles.css');
    let css = '';
    try {
      css = readFileSync(cssPath, 'utf8');
    } catch {
      // Template ships without dedicated styles.css — leave empty.
    }
    templates[t.meta.id] = { css, meta: t.meta };
  }
  cached = { resetCss, printCss, templates };
  return cached;
}
