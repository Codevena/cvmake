import type { TemplateDefinition } from '@codevena/forq-schema';
import { EditorialTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const editorial: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: EditorialTemplate,
};
