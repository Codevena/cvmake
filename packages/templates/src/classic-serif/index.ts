import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { ClassicSerifTemplate } from './Template.js';

function loadCss(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.join(dir, 'styles.css'), 'utf8');
}

let _css: string | undefined;

export const classicSerif: TemplateDefinition & { css: string } = {
  meta: templateMeta,
  palettes,
  Component: ClassicSerifTemplate,
  get css() {
    return (_css ??= loadCss());
  },
};
