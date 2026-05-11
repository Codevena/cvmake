import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { BauhausTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const bauhaus: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: BauhausTemplate,
};
