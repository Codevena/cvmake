import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { NoirTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const noir: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: NoirTemplate,
};
