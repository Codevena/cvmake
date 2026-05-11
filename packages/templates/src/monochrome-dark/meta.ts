import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'monochrome-dark',
  name: 'Monochrome Dark',
  description:
    'Dunkles Zweispalten-Layout mit Sans-Serif-Typografie, runder Foto-Duotone-Behandlung und sparsamen Akzenten. Ideal für Senior Engineers, Tech Leads und Creative Directors.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
