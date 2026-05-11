import type { TemplateMeta } from '@codevena/cvmake-schema';

export const meta: TemplateMeta = {
  id: 'creative-accent',
  name: 'Creative Accent',
  description:
    'Asymmetrisches 60/40-Layout mit Fraunces-Display-Typografie, farbigem Drop-Cap, Foto-Spalte und Skill-Pills. Ideal für Creative, Marketing und Editorial Tech.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
