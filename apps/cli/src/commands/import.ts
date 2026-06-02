import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CVDataSchema } from '@codevena/cvmake-schema';
import yaml from 'js-yaml';
import pc from 'picocolors';

export interface ImportArgs {
  input: string;
  output: string;
  lang: string;
  force?: boolean | undefined;
}

type Level = 'native' | 'C2' | 'C1' | 'B2' | 'B1' | 'A2' | 'A1' | 'basic';
type Rec = Record<string, unknown>;

const SECTION_TITLES = {
  en: {
    projects: 'Projects',
    awards: 'Awards',
    certificates: 'Certificates',
    publications: 'Publications',
    volunteer: 'Volunteering',
  },
  de: {
    projects: 'Projekte',
    awards: 'Auszeichnungen',
    certificates: 'Zertifikate',
    publications: 'Publikationen',
    volunteer: 'Ehrenamt',
  },
} as const;

// --- small coercion helpers (JSON Resume fields are untyped at runtime) ---
function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asRecord(v: unknown): Rec {
  return typeof v === 'object' && v !== null ? (v as Rec) : {};
}
function asStringArray(v: unknown): string[] {
  return asArray(v)
    .map((x) => asString(x))
    .filter((x): x is string => x !== undefined);
}

/**
 * JSON Resume stores a single `name`; cvmake splits first/last. Heuristic: the
 * last whitespace-delimited token is the surname, the rest the given name(s).
 * A single token is duplicated (valid, the user can edit).
 */
function splitName(name: string | undefined): { firstName: string; lastName: string } {
  const tokens = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { firstName: 'First', lastName: 'Last' };
  if (tokens.length === 1) {
    const only = tokens[0] ?? 'Name';
    return { firstName: only, lastName: only };
  }
  const last = tokens[tokens.length - 1] ?? 'Last';
  return { firstName: tokens.slice(0, -1).join(' '), lastName: last };
}

/** Normalises a JSON Resume date to YYYY / YYYY-MM / YYYY-MM-DD (cvmake schema). */
function normalizeDate(d: unknown): string | undefined {
  if (typeof d !== 'string') return undefined;
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/.exec(d.trim());
  const year = m?.[1];
  if (!year) return undefined;
  const mon = m?.[2] ? Number(m[2]) : undefined;
  const day = m?.[3] ? Number(m[3]) : undefined;
  if (mon === undefined || mon < 1 || mon > 12) return year;
  const mm = String(mon).padStart(2, '0');
  if (day === undefined || day < 1 || day > 31) return `${year}-${mm}`;
  return `${year}-${mm}-${String(day).padStart(2, '0')}`;
}

function dateRange(start: unknown, end: unknown): string | undefined {
  const s = normalizeDate(start);
  const e = normalizeDate(end);
  if (s && e) return `${s} – ${e}`;
  return s ?? e;
}

/** A bare social handle from a profile's username, or extracted from its URL. */
function safeHandle(profile: Rec): string | undefined {
  const u = asString(profile.username);
  if (u && /^[A-Za-z0-9._-]+$/.test(u)) return u;
  const url = asString(profile.url);
  if (url) {
    const last = url.replace(/\/+$/, '').split('/').pop();
    if (last && /^[A-Za-z0-9._-]+$/.test(last)) return last;
  }
  return undefined;
}

/** Keep a photo only if it is a safe shape the cvmake schema accepts. */
function safePhoto(image: unknown): string | undefined {
  const s = asString(image);
  if (!s) return undefined;
  if (/^(https?:\/\/|data:image\/)/i.test(s)) return s;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) return s; // relative path, no scheme
  return undefined;
}

function validEmail(v: unknown): string | undefined {
  const s = asString(v);
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : undefined;
}

function validUrl(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  try {
    new URL(s);
    return s;
  } catch {
    return undefined;
  }
}

/** Best-effort map from JSON Resume free-text `fluency` to the CEFR enum. */
function mapFluency(fluency: unknown): Level {
  const f = (asString(fluency) ?? '').toLowerCase();
  const cefr = /^(c2|c1|b2|b1|a2|a1)$/.exec(f);
  if (cefr?.[1]) return cefr[1].toUpperCase() as Level;
  if (/native|mother tongue|muttersprache/.test(f)) return 'native';
  if (/fluent|full professional|bilingual/.test(f)) return 'C2';
  if (/professional/.test(f)) return 'C1';
  if (/intermediate|limited working/.test(f)) return 'B1';
  if (/elementary|basic|beginner|grund/.test(f)) return 'basic';
  return 'B2';
}

interface CustomItem {
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
  bullets?: string[];
}

/**
 * Converts a JSON Resume (https://jsonresume.org) document into a cvmake CV
 * YAML file. Unmappable required fields fall back to sensible defaults; entries
 * lacking a usable start date are skipped (reported). Returns a process exit code.
 */
export function runImport(args: ImportArgs): number {
  const lang = args.lang === 'de' ? 'de' : args.lang === 'en' ? 'en' : null;
  if (!lang) {
    console.error(pc.red(`✗ unknown language: ${args.lang} (expected 'de' or 'en')`));
    return 1;
  }

  const target = path.resolve(args.output);
  if (existsSync(target) && !args.force) {
    console.error(pc.red(`✗ ${args.output} already exists — use --force to overwrite`));
    return 1;
  }

  let raw: string;
  try {
    raw = readFileSync(path.resolve(args.input), 'utf8');
  } catch {
    console.error(pc.red(`✗ cannot read ${args.input}`));
    return 1;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(pc.red(`✗ ${args.input} is not valid JSON: ${(err as Error).message}`));
    return 1;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    console.error(pc.red(`✗ ${args.input} is not a JSON Resume object`));
    return 1;
  }
  const resume = parsed as Rec;
  const basics = asRecord(resume.basics);

  const { firstName, lastName } = splitName(asString(basics.name));
  const profiles = asArray(basics.profiles).map(asRecord);
  const github = profiles
    .filter((p) => asString(p.network)?.toLowerCase() === 'github')
    .map(safeHandle)
    .find(Boolean);
  const linkedin = profiles
    .filter((p) => asString(p.network)?.toLowerCase() === 'linkedin')
    .map(safeHandle)
    .find(Boolean);

  const loc = asRecord(basics.location);
  const locationStr =
    [asString(loc.city), asString(loc.region) ?? asString(loc.countryCode)]
      .filter((x): x is string => x !== undefined)
      .join(', ') || undefined;

  const email = validEmail(basics.email);
  const phone = asString(basics.phone);
  const website = validUrl(basics.url);
  const contacts: Rec = {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
    ...(github ? { github } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(locationStr ? { location: locationStr } : {}),
  };

  let skippedWork = 0;
  const experience = asArray(resume.work).flatMap((w0) => {
    const w = asRecord(w0);
    const startDate = normalizeDate(w.startDate);
    if (!startDate) {
      skippedWork += 1;
      return [];
    }
    const highlights = asStringArray(w.highlights);
    const summary = asString(w.summary);
    const bullets = highlights.length ? highlights : summary ? [summary] : [];
    const endDate = normalizeDate(w.endDate);
    const location = asString(w.location);
    return [
      {
        title: asString(w.position) ?? asString(w.name) ?? 'Position',
        company: asString(w.name) ?? 'Company',
        ...(location ? { location } : {}),
        startDate,
        ...(endDate ? { endDate } : {}),
        bullets,
      },
    ];
  });

  let skippedEdu = 0;
  const education = asArray(resume.education).flatMap((e0) => {
    const e = asRecord(e0);
    const startDate = normalizeDate(e.startDate);
    if (!startDate) {
      skippedEdu += 1;
      return [];
    }
    const degree = [asString(e.studyType), asString(e.area)]
      .filter((x): x is string => x !== undefined)
      .join(', ');
    const courses = asStringArray(e.courses);
    const endDate = normalizeDate(e.endDate);
    const location = asString(e.location);
    return [
      {
        degree: degree || 'Studies',
        institution: asString(e.institution) ?? 'Institution',
        ...(location ? { location } : {}),
        startDate,
        ...(endDate ? { endDate } : {}),
        ...(courses.length ? { bullets: courses } : {}),
      },
    ];
  });

  // Skill category names become object keys — guard against prototype-polluting
  // keys from untrusted input by treating them as flat-stack entries instead.
  const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const stack: string[] = [];
  const categorized: Record<string, string[]> = {};
  for (const s0 of asArray(resume.skills)) {
    const s = asRecord(s0);
    const name = asString(s.name);
    if (!name) continue;
    const keywords = asStringArray(s.keywords);
    if (keywords.length && !UNSAFE_KEYS.has(name)) categorized[name] = keywords;
    else stack.push(name);
  }
  const hasSkills = stack.length > 0 || Object.keys(categorized).length > 0;
  const skills = hasSkills
    ? {
        ...(stack.length ? { stack } : {}),
        ...(Object.keys(categorized).length ? { categorized } : {}),
      }
    : undefined;

  const languages = asArray(resume.languages).flatMap((l0) => {
    const l = asRecord(l0);
    const name = asString(l.language) ?? asString(l.name);
    if (!name) return [];
    return [{ name, level: mapFluency(l.fluency) }];
  });

  const titles = SECTION_TITLES[lang];
  const customSections: Array<{ id: string; title: string; items: CustomItem[] }> = [];
  const pushSection = (id: string, title: string, items: CustomItem[]) => {
    if (items.length) customSections.push({ id, title, items });
  };

  pushSection(
    'projects',
    titles.projects,
    asArray(resume.projects).flatMap((p0): CustomItem[] => {
      const p = asRecord(p0);
      const title = asString(p.name);
      if (!title) return [];
      const subtitle = asStringArray(p.roles).join(', ') || asString(p.entity);
      const date = dateRange(p.startDate, p.endDate);
      const description = asString(p.description);
      const bullets = asStringArray(p.highlights);
      return [
        {
          title,
          ...(subtitle ? { subtitle } : {}),
          ...(date ? { date } : {}),
          ...(description ? { description } : {}),
          ...(bullets.length ? { bullets } : {}),
        },
      ];
    }),
  );

  pushSection(
    'awards',
    titles.awards,
    asArray(resume.awards).flatMap((a0): CustomItem[] => {
      const a = asRecord(a0);
      const title = asString(a.title);
      if (!title) return [];
      const subtitle = asString(a.awarder);
      const date = normalizeDate(a.date);
      const description = asString(a.summary);
      return [
        {
          title,
          ...(subtitle ? { subtitle } : {}),
          ...(date ? { date } : {}),
          ...(description ? { description } : {}),
        },
      ];
    }),
  );

  pushSection(
    'certificates',
    titles.certificates,
    asArray(resume.certificates).flatMap((c0): CustomItem[] => {
      const c = asRecord(c0);
      const title = asString(c.name);
      if (!title) return [];
      const subtitle = asString(c.issuer);
      const date = normalizeDate(c.date);
      return [{ title, ...(subtitle ? { subtitle } : {}), ...(date ? { date } : {}) }];
    }),
  );

  pushSection(
    'publications',
    titles.publications,
    asArray(resume.publications).flatMap((p0): CustomItem[] => {
      const p = asRecord(p0);
      const title = asString(p.name);
      if (!title) return [];
      const subtitle = asString(p.publisher);
      const date = normalizeDate(p.releaseDate);
      const description = asString(p.summary);
      return [
        {
          title,
          ...(subtitle ? { subtitle } : {}),
          ...(date ? { date } : {}),
          ...(description ? { description } : {}),
        },
      ];
    }),
  );

  pushSection(
    'volunteer',
    titles.volunteer,
    asArray(resume.volunteer).flatMap((v0): CustomItem[] => {
      const v = asRecord(v0);
      const title = asString(v.position) ?? asString(v.organization);
      if (!title) return [];
      const subtitle = asString(v.organization);
      const date = dateRange(v.startDate, v.endDate);
      const description = asString(v.summary);
      const bullets = asStringArray(v.highlights);
      return [
        {
          title,
          ...(subtitle ? { subtitle } : {}),
          ...(date ? { date } : {}),
          ...(description ? { description } : {}),
          ...(bullets.length ? { bullets } : {}),
        },
      ];
    }),
  );

  const photo = safePhoto(basics.image);
  const title = asString(basics.label);
  const summary = asString(basics.summary);
  const cv: Rec = {
    meta: { locale: lang },
    personal: {
      firstName,
      lastName,
      ...(title ? { title } : {}),
      ...(photo ? { photo } : {}),
      contacts,
    },
    ...(summary ? { summary } : {}),
    experience,
    education,
    ...(skills ? { skills } : {}),
    ...(languages.length ? { languages } : {}),
    ...(customSections.length ? { customSections } : {}),
    rendering: { template: 'classic-serif' },
  };

  const result = CVDataSchema.safeParse(cv);
  const body = yaml.dump(result.success ? result.data : cv, { lineWidth: 100, noRefs: true });
  const header =
    lang === 'de'
      ? `# Aus JSON Resume importiert. Felder prüfen/anpassen, dann: cvmake build ${args.output}\n`
      : `# Imported from JSON Resume. Review/adjust the fields, then: cvmake build ${args.output}\n`;
  try {
    writeFileSync(target, header + body, 'utf8');
  } catch (err) {
    console.error(pc.red(`✗ cannot write ${args.output}: ${(err as Error).message}`));
    return 1;
  }

  console.warn(pc.green(`✓ wrote ${args.output}`));
  if (skippedWork || skippedEdu) {
    console.warn(
      pc.yellow(
        `  note: skipped ${skippedWork} work and ${skippedEdu} education entries without a start date`,
      ),
    );
  }
  if (!result.success) {
    console.warn(
      pc.yellow(
        `  note: output has ${result.error.issues.length} schema issue(s) — run \`cvmake validate ${args.output}\` to review`,
      ),
    );
  }
  console.warn(`  next: ${pc.bold(`cvmake build ${args.output}`)}`);
  return 0;
}
