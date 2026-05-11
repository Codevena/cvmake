import type { CVData } from '@codevena/cvmake-schema';

const HIDDABLE = new Set([
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'customSections',
]);

/**
 * Returns a new CVData with sections listed in `rendering.hiddenSections` stripped:
 * - `summary` and `skills` are removed (omitted), since both are optional.
 * - Array-valued sections (`experience`, `education`, `languages`, `customSections`)
 *   are reset to `[]`.
 *
 * Unknown hidden-section IDs are ignored. The `personal` and `meta` blocks are
 * always preserved.
 */
export function applyHiddenSections(data: CVData): CVData {
  const hidden = data.rendering.hiddenSections ?? [];
  if (hidden.length === 0) return data;

  const known = hidden.filter((id) => HIDDABLE.has(id));
  if (known.length === 0) return data;

  // Destructure-and-omit pattern keeps us compatible with
  // `exactOptionalPropertyTypes: true` (no `undefined` assignment to
  // optional `summary` / `skills`).
  const { summary, skills, ...rest } = data;
  const result: CVData = {
    ...rest,
    ...(known.includes('summary') ? {} : summary !== undefined ? { summary } : {}),
    experience: known.includes('experience') ? [] : data.experience,
    education: known.includes('education') ? [] : data.education,
    ...(known.includes('skills') ? {} : skills !== undefined ? { skills } : {}),
    ...(known.includes('languages')
      ? { languages: [] }
      : data.languages !== undefined
        ? { languages: data.languages }
        : {}),
    ...(known.includes('customSections')
      ? { customSections: [] }
      : data.customSections !== undefined
        ? { customSections: data.customSections }
        : {}),
  };
  return result;
}
