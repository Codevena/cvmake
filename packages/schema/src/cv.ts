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
/**
 * Splits a `YYYY`, `YYYY-MM` or `YYYY-MM-DD` string into its parts, or returns
 * `undefined` when it is not one of those shapes.
 */
function parseCvDate(v: string): { y: number; m?: number; d?: number } | undefined {
  const m = /^(\d{4})(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/.exec(v);
  if (!m?.[1]) return undefined;
  return {
    y: Number(m[1]),
    ...(m[2] ? { m: Number(m[2]) } : {}),
    ...(m[3] ? { d: Number(m[3]) } : {}),
  };
}

export const CvDateSchema = z
  .string()
  .regex(
    /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/,
    'expected YYYY, YYYY-MM, or YYYY-MM-DD',
  )
  // The regex checks ranges, not the calendar: `2021-02-31`, `2021-04-31` and
  // `2023-02-29` all satisfy `0[1-9]|[12]\d|3[01]` and are not days. A date
  // nobody can point at on a calendar is a typo, and it renders as one.
  .refine(
    (v) => {
      const p = parseCvDate(v);
      if (!p || p.m === undefined || p.d === undefined) return true;
      const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
      return dt.getUTCFullYear() === p.y && dt.getUTCMonth() === p.m - 1 && dt.getUTCDate() === p.d;
    },
    { message: 'not a real calendar date' },
  );

/**
 * The first instant a `YYYY`/`YYYY-MM`/`YYYY-MM-DD` value can mean, and the
 * last — as comparable `YYYY-MM-DD` strings.
 *
 * Both ends are needed because the two fields carry different granularity in
 * practice. `start: 2020-05, end: 2020` is a person who says "until sometime
 * in 2020", and a naive string or same-precision comparison calls that an
 * error. Comparing the START of the start against the END of the end asks the
 * only question worth asking: is there any reading under which the entry makes
 * sense?
 */
function periodStart(v: string): string | undefined {
  const p = parseCvDate(v);
  if (!p) return undefined;
  return `${String(p.y).padStart(4, '0')}-${String(p.m ?? 1).padStart(2, '0')}-${String(p.d ?? 1).padStart(2, '0')}`;
}
function periodEnd(v: string): string | undefined {
  const p = parseCvDate(v);
  if (!p) return undefined;
  const m = p.m ?? 12;
  const d = p.d ?? new Date(Date.UTC(p.y, m, 0)).getUTCDate();
  return `${String(p.y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** `endDate` must not finish before `startDate` can begin. */
function endNotBeforeStart(v: { startDate: string; endDate?: string | undefined }): boolean {
  if (v.endDate === undefined || v.endDate === '') return true;
  const s = periodStart(v.startDate);
  const e = periodEnd(v.endDate);
  if (s === undefined || e === undefined) return true; // shape errors are reported by the field
  return e >= s;
}

const END_BEFORE_START: { message: string; path: (string | number)[] } = {
  message: 'endDate is before startDate',
  path: ['endDate'],
};

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

const HTTP_SCHEMES = new Set(['http:', 'https:']);

/**
 * `website` is rendered as a link, so a `javascript:` or `data:` value is a
 * live hazard in the browser preview and in any HTML export. Restrict it to
 * http(s) — `mailto:` included, since the address has its own field.
 *
 * The parser decides, not a regex on the raw string: `.url()` has already
 * accepted the value as a URL, so what matters is what a URL parser resolves
 * it to. But the parser must be caught. zod runs this refinement even when
 * `.url()` has ALREADY failed, and `new URL('')` throws a TypeError straight
 * out of `safeParse` — which would crash the editor's resolver on every
 * keystroke that empties the field, and turn a 422 into an unhandled 500 in
 * the save and export routes.
 *
 * Returning true for an unparseable value is safe rather than lax: in zod
 * 3.23.8 `.url()` IS `new URL()` in a try/catch, so the set reaching this
 * catch is exactly the set `.url()` already rejected. It also keeps one error
 * message per problem instead of two. (zod 4's `z.url()` is regex-based —
 * revisit this reasoning if the dependency moves.)
 */
function isHttpUrl(v: string): boolean {
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return true;
  }
  return HTTP_SCHEMES.has(u.protocol);
}

export const ContactsSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().refine(isHttpUrl, 'website must be an http(s) URL').optional(),
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
  .strict()
  .refine(endNotBeforeStart, END_BEFORE_START);

export const EducationItemSchema = z
  .object({
    degree: z.string().min(1),
    institution: z.string().min(1),
    location: z.string().optional(),
    startDate: CvDateSchema,
    endDate: CvDateSchema.optional(),
    bullets: z.array(z.string()).optional(),
  })
  .strict()
  .refine(endNotBeforeStart, END_BEFORE_START);

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
    // The refine sits on the ARRAY, not on the object: on the object it would
    // turn RenderingSchema into a ZodEffects and report the error at
    // `rendering` instead of `rendering.sectionOrder`, which the editor cannot
    // attach to a field.
    sectionOrder: z
      .array(z.string())
      .refine((v) => new Set(v).size === v.length, 'sectionOrder must not contain duplicates')
      .optional(),
    hiddenSections: z.array(z.string()).optional(),
  })
  .strict();

/**
 * An entirely empty skills object means "no skills section", and is normalised
 * away rather than rejected.
 *
 * The editor registers `skills.stack` as soon as the Skills tab is opened, which
 * leaves `skills: {}` behind — the form then fails validation although the user
 * has not touched a single field, autosave stops, PDF export greys out, and
 * nothing says where the problem is. Treating that shape as absent removes the
 * dead end at its source.
 *
 * A HALF-filled section is still rejected on purpose: a freshly added category
 * with no skills in it is caught by the `.min(1)` on the array, so the value
 * never reaches disk. (The refusal comes from the server, not from the form —
 * `SkillsSection` sets the value without `shouldValidate`, so the client keeps
 * reporting the form as valid and the save is rejected with 422, which is what
 * marks the field and the tab.)
 *
 * What this must NOT do is swallow a defect. `!Array.isArray(s.stack)` is true
 * for "absent" but equally for "present and wrong", so an earlier version made
 * `stack: 'TypeScript'` (a scalar where a list belongs — the most common
 * hand-written YAML mistake), `stacks: [...]` (a plural typo), `stack: 42` and
 * `skills: ['TS']` all parse successfully with the section silently deleted:
 * a PDF with no skills and exit 0, the exact failure this release removed from
 * the palette path. An unknown key or a wrong type is a defect in the file and
 * has to reach the schema, which names the field.
 */
function normaliseSkills(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const s = v as Record<string, unknown>;
  if (Object.keys(s).some((k) => k !== 'stack' && k !== 'categorized')) return v;
  const stackEmpty = s.stack === undefined || (Array.isArray(s.stack) && s.stack.length === 0);
  const cat = s.categorized;
  const catsEmpty =
    cat === undefined ||
    cat === null ||
    (typeof cat === 'object' && !Array.isArray(cat) && Object.keys(cat).length === 0);
  return stackEmpty && catsEmpty ? undefined : v;
}

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
    skills: z.preprocess(normaliseSkills, SkillsSchema.optional()),
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
