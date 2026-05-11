import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { MonochromeDarkTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const monochromeDark: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: MonochromeDarkTemplate,
};
