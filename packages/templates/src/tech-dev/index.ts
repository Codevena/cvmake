import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { TechDevTemplate } from './Template.js';

export const techDev: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: TechDevTemplate,
};
