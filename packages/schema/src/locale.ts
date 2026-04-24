import { z } from 'zod';

export const LocaleSchema = z.enum(['de', 'en']);
export type Locale = z.infer<typeof LocaleSchema>;

export const LABEL_KEYS = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'present',
  'personalData',
  'contact',
  'github',
  'linkedin',
  'website',
  'email',
  'phone',
  'location',
  'birthDate',
  'drivingLicense',
  'maritalStatus',
] as const;

export type LabelKey = (typeof LABEL_KEYS)[number];
export type LabelDictionary = Record<LabelKey, string>;
