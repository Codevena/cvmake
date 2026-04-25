// Server-only entrypoint. NOT exported from the main `bootstrap.ts`/`index.ts`,
// so importing this from a client bundle would be a build error rather than a
// silent runtime failure. Client code must NEVER import from
// `@codevena/forq-templates/css`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export function loadTemplateCss(id: string): string {
  return readFileSync(path.join(root, id, 'styles.css'), 'utf8');
}
