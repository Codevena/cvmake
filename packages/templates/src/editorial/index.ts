import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { EditorialTemplate } from './Template.js';

export const editorial: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: EditorialTemplate,
};
