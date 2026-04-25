import type { TemplateMeta } from '@codevena/forq-schema';

export const meta: TemplateMeta = {
  id: 'corporate',
  name: 'Corporate',
  description:
    'Einspaltig, ATS-optimiert, webssichere Schrift. Präzise Typografie für DAX-Konzerne, Consulting und Finance.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
