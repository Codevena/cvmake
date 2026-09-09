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

const TAB = 9;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const SPACE = 0x20;

/** True if the URL parser would strip a character out of the middle of `v`. */
function containsStrippedWhitespace(v: string): boolean {
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c === TAB || c === LINE_FEED || c === CARRIAGE_RETURN) return true;
  }
  return false;
}

/** True if the URL parser would trim a leading or trailing character off `v`. */
function hasTrimmedEdge(v: string): boolean {
  return v.charCodeAt(0) <= SPACE || v.charCodeAt(v.length - 1) <= SPACE;
}

const PHOTO_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * The photo field flows into `<img src>` of a document that the server renders
 * in a real browser, so a remote value makes the render host fetch it. Only two
 * kinds of value are useful there: a local path (which the renderer inlines as
 * a data URL before rendering) and an already-embedded `data:image/` URI.
 * Everything else — http(s), file:, javascript:, protocol-relative — is refused
 * here, before any browser starts.
 *
 * The two guards at the top are not cosmetic. The URL parser strips ASCII
 * tab/CR/LF from anywhere in the input and trims leading and trailing C0
 * controls and spaces BEFORE it looks for a scheme, so a predicate reading the
 * raw string sees something different from what the browser resolves:
 * "ht\ttp://169.254.169.254/" carries no scheme for a regex and a perfectly
 * good one for Chromium. Rejecting those characters instead of mirroring the
 * normalisation keeps the two views identical without owning the drift.
 *
 * `""` is accepted on purpose: it means "no photo" and is what the editor
 * writes when a user removes their picture.
 */
function isSafePhotoValue(v: string): boolean {
  if (v === '') return true;
  if (containsStrippedWhitespace(v)) return false;
  if (hasTrimmedEdge(v)) return false;
  if (PHOTO_SCHEME.test(v)) return /^data:image\//i.test(v);
  if (/^[/\\]{2}/.test(v)) return false; // protocol-relative is not a local path
  return true;
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
      .refine(isSafePhotoValue, 'photo must be a local path or a data:image URI')
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
