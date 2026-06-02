import { z } from 'zod';
import { LocaleSchema } from './locale.js';

/**
 * Accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` with a bounded month (01-12) and
 * day (01-31). Used for experience/education periods that flow into the
 * template date formatter — an out-of-range month like "2020-13" would
 * otherwise render literally as "undefined 2020" in the exported PDF.
 * (birthDate is intentionally left free-text: it is rendered verbatim and may
 * use localized formats like "13.01.1987".)
 */
export const CvDateSchema = z
  .string()
  .regex(
    /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/,
    'expected YYYY, YYYY-MM, or YYYY-MM-DD',
  );

// A bare social handle (e.g. "codevena"), NOT a full URL — templates render it
// as `github.com/<handle>` / `linkedin.com/in/<handle>`, so a smuggled URL like
// "https://evil.com/x" would otherwise produce "github.com/https://evil.com/x".
const HandleSchema = z.string().regex(/^[A-Za-z0-9._-]+$/, 'expected a bare handle, not a URL');

/**
 * Defense-in-depth for the photo field: it flows into `<img src>`. Reject
 * dangerous URI schemes (javascript:, non-image data:, file:, vbscript:) while
 * still allowing relative paths, `/photos/...`, http(s) URLs, and data:image
 * URIs. The actual file read is separately path-contained in core/photo-embed.
 */
function isSafePhotoValue(v: string): boolean {
  const trimmed = v.trimStart();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!scheme) return true; // no scheme → relative path
  const s = (scheme[1] ?? '').toLowerCase();
  if (s === 'http' || s === 'https') return true;
  return /^data:image\//i.test(trimmed);
}

export const ContactsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    github: HandleSchema.optional(),
    linkedin: HandleSchema.optional(),
    location: z.string().optional(),
  })
  .strict();

export const PersonalSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    title: z.string().optional(),
    photo: z
      .string()
      .refine(isSafePhotoValue, 'photo must be a path, http(s) URL, or data:image URI')
      .optional(),
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
    startDate: CvDateSchema,
    endDate: CvDateSchema.optional(),
    bullets: z.array(z.string()),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export const EducationItemSchema = z
  .object({
    degree: z.string().min(1),
    institution: z.string().min(1),
    location: z.string().optional(),
    startDate: CvDateSchema,
    endDate: CvDateSchema.optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strict();

export const SkillsSchema = z
  .object({
    stack: z.array(z.string()).optional(),
    // Category names must be non-empty (an "" key renders as a blank heading)
    // and each category must contain at least one skill — an empty category
    // would render a heading with no content in the PDF. The editor leverages
    // this: a freshly-added empty category makes the form invalid, so autosave
    // pauses (never persisting it) until the user adds a skill.
    categorized: z.record(z.string().min(1), z.array(z.string()).min(1)).optional(),
  })
  .strict()
  .refine(
    (s) => (s.stack?.length ?? 0) > 0 || Object.keys(s.categorized ?? {}).length > 0,
    'skills must contain at least a stack entry or one non-empty category',
  );

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
  .strict()
  .refine(
    (d) => {
      const ids = d.customSections?.map((s) => s.id) ?? [];
      return new Set(ids).size === ids.length;
    },
    { message: 'customSection ids must be unique', path: ['customSections'] },
  );

export type CVData = z.infer<typeof CVDataSchema>;
export type Personal = z.infer<typeof PersonalSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type CustomSection = z.infer<typeof CustomSectionSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;
