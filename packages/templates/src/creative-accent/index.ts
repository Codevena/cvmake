import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { CreativeAccentTemplate } from './Template.js';

export const creativeAccent: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: CreativeAccentTemplate,
};
