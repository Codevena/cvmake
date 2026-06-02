// Server-only entrypoint. NOT exported from the main `bootstrap.ts`/`index.ts`,
// so importing this from a client bundle would be a build error rather than a
// silent runtime failure. Client code must NEVER import from
// `@codevena/cvmake-templates/css`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export function loadTemplateCss(id: string): string {
  return readFileSync(path.join(root, id, 'styles.css'), 'utf8');
}

export function loadResetCss(): string {
  return readFileSync(path.join(root, 'shared', 'reset.css'), 'utf8');
}

export function loadPrintCss(): string {
  return readFileSync(path.join(root, 'shared', 'print.css'), 'utf8');
}

/**
 * Removes the relative `@import "../shared/reset.css";` / `print.css` lines that
 * every template's styles.css starts with. Those URLs cannot resolve under
 * Puppeteer's `page.setContent` (no base URL), so in the PDF export / CLI path
 * they are silently dropped — losing @page margins, box-sizing and page-break
 * rules. Callers must instead prepend the shared CSS via loadResetCss/loadPrintCss.
 * Absolute font @imports (e.g. Google Fonts `@import url(...)`) are preserved.
 */
export function stripSharedImports(css: string): string {
  return css.replace(/@import\s+["']\.\.\/shared\/[^"']+["'];?[^\S\n]*\n?/g, '');
}
