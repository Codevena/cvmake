import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { type CVData, CVDataSchema, type Locale } from '@codevena/forq-schema';
import yaml from 'js-yaml';
import { ValidationError, YAMLParseError } from './errors.js';

function inferLocaleFromFilename(filePath: string): Locale | null {
  const base = path.basename(filePath, path.extname(filePath));
  const match = /\.(de|en)$/i.exec(base);
  if (!match || !match[1]) return null;
  return match[1].toLowerCase() as Locale;
}

export async function loadCV(filePath: string): Promise<CVData> {
  const raw = await readFile(filePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = yaml.load(raw, { schema: yaml.CORE_SCHEMA, filename: filePath });
  } catch (err) {
    const e = err as yaml.YAMLException;
    throw new YAMLParseError(filePath, e.reason ?? e.message, e.mark?.line, e.mark?.column);
  }

  const inferred = inferLocaleFromFilename(filePath);
  if (inferred && parsed && typeof parsed === 'object' && 'meta' in parsed) {
    const meta = (parsed as { meta?: { locale?: string } }).meta;
    if (meta && !meta.locale) meta.locale = inferred;
  }

  const result = CVDataSchema.safeParse(parsed);
  if (!result.success) throw new ValidationError(filePath, result.error.issues);
  return result.data;
}
