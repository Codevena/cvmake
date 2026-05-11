import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { ClassicSerifTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const classicSerif: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: ClassicSerifTemplate,
};
