import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { CorporateTemplate } from './Template.js';

function loadCss(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.join(dir, 'styles.css'), 'utf8');
}

let _css: string | undefined;

export const corporate: TemplateDefinition & { css: string } = {
  meta: templateMeta,
  palettes,
  Component: CorporateTemplate,
  get css() {
    return (_css ??= loadCss());
  },
};
