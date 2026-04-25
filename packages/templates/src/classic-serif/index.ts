import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { ClassicSerifTemplate } from './Template.js';

export const classicSerif: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: ClassicSerifTemplate,
};
