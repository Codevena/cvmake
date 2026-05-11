import type { TemplateDefinition } from '@codevena/cvmake-schema';
import { MagazineTemplate } from './Template.js';
import { meta as templateMeta } from './meta.js';
import { palettes } from './palettes.js';

export const magazine: TemplateDefinition = {
  meta: templateMeta,
  palettes,
  Component: MagazineTemplate,
};
