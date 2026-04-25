import type { TemplateDefinition } from '@codevena/forq-schema';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';
import { MonochromeDarkTemplate } from './Template.js';

export const monochromeDark: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: MonochromeDarkTemplate,
};
