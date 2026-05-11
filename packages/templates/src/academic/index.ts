import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { AcademicTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const academic: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: AcademicTemplate,
};
