import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { TechDevTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const techDev: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: TechDevTemplate,
};
