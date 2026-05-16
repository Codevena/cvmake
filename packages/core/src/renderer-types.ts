import type { CVData, Locale, TemplateDefinition } from '@codevena/cvmake-schema';

export interface RenderInput {
  data: CVData;
  template: TemplateDefinition;
  paletteId?: string;
}

export interface RenderOutput {
  html: string;
  css: string;
  locale: Locale;
}
