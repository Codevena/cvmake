import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TemplateDefinition } from '@cvmake/schema';
import { meta } from './meta.js';
import { palettes } from './palettes.js';
import { ClassicSerifTemplate } from './Template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

export const classicSerif: TemplateDefinition & { css: string } = {
  meta,
  palettes,
  Component: ClassicSerifTemplate,
  css,
};
