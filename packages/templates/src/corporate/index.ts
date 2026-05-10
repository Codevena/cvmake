import type { TemplateDefinition } from '@codevena/forq-schema';
import { CorporateTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const corporate: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: CorporateTemplate,
};
