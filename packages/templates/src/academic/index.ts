import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { AcademicTemplate } from './Template.js';

export const academic: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: AcademicTemplate,
};
