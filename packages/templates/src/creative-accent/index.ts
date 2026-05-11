import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { CreativeAccentTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const creativeAccent: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: CreativeAccentTemplate,
};
