import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'bauhaus',
  name: 'Bauhaus',
  description:
    'Beige Canvas mit geometrischen Akzentformen (Kreis, Quadrat, Dreieck), Futura, blau-umrahmtem Kreis-Foto. Form follows function — mit einem Lächeln.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
