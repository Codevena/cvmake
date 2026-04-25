import type { TemplateMeta } from '@codevena/forq-schema';

export const meta: TemplateMeta = {
  id: 'editorial',
  name: 'Editorial',
  description:
    'Magazine-style print layout with Fraunces display type, drop-cap summary, and two-column newspaper grid. Perfect for journalists, editors, and content-forward roles.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
