import type { TemplateMeta } from '@cvmake/schema';

export const meta: TemplateMeta = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  description:
    'Single-column sans-serif layout with generous whitespace, uppercase accent headings, and a clean typographic hierarchy — ideal for Product, UX, and Design-adjacent roles.',
  supportsPhoto: true,
  photoFallback: 'initials',
  supportedLocales: ['de', 'en'],
  defaultSectionOrder: ['summary', 'experience', 'education', 'skills', 'languages'],
  supportsPagination: true,
};
