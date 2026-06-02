import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'corporate',
  name: 'Corporate',
  description:
    'Einspaltig, ATS-optimiert, webssichere Schrift. Präzise Typografie für DAX-Konzerne, Consulting und Finance.',
  supportsPhoto: true,
  // The corporate template renders the photo only (no initials circle, per its
  // brief — see Template.tsx), so the declared fallback must be 'none' to match.
  photoFallback: 'none',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
