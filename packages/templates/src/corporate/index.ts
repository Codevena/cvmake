import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { CorporateTemplate } from './Template.js';

export const corporate: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: CorporateTemplate,
};
