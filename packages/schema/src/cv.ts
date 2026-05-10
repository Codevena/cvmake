import { z } from 'zod';
import { LocaleSchema } from './locale.js';

export const ContactsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    github: z.string().optional(),
    linkedin: z.string().optional(),
    location: z.string().optional(),
  })
  .strict();

export const PersonalSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    title: z.string().optional(),
    photo: z.string().optional(),
    birthDate: z.string().optional(),
    maritalStatus: z.string().optional(),
    drivingLicense: z.string().optional(),
    contacts: ContactsSchema,
  })
  .strict();

export const ExperienceItemSchema = z
  .object({
    title: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    bullets: z.array(z.string()),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export const EducationItemSchema = z
  .object({
    degree: z.string().min(1),
    institution: z.string().min(1),
    location: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strict();

export const SkillsSchema = z
  .object({
    stack: z.array(z.string()).optional(),
    categorized: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strict();

export const LanguageLevelSchema = z.enum(['native', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1', 'basic']);

export const LanguageItemSchema = z
  .object({
    name: z.string().min(1),
    level: LanguageLevelSchema,
    label: z.string().optional(),
  })
  .strict();

export const CustomSectionItemSchema = z
  .object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strict();

export const CustomSectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    items: z.array(CustomSectionItemSchema),
  })
  .strict();

export const RenderingSchema = z
  .object({
    template: z.string().min(1),
    palette: z.string().optional(),
    accentOverride: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    sectionOrder: z.array(z.string()).optional(),
    hiddenSections: z.array(z.string()).optional(),
  })
  .strict();

export const CVDataSchema = z
  .object({
    meta: z
      .object({
        locale: LocaleSchema,
        updatedAt: z.string().optional(),
      })
      .strict(),
    personal: PersonalSchema,
    summary: z.string().optional(),
    experience: z.array(ExperienceItemSchema),
    education: z.array(EducationItemSchema),
    skills: SkillsSchema.optional(),
    languages: z.array(LanguageItemSchema).optional(),
    customSections: z.array(CustomSectionSchema).optional(),
    rendering: RenderingSchema,
  })
  .strict();

export type CVData = z.infer<typeof CVDataSchema>;
export type Personal = z.infer<typeof PersonalSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type CustomSection = z.infer<typeof CustomSectionSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;
