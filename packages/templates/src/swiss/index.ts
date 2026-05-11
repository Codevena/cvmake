import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { SwissTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const swiss: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: SwissTemplate,
};
