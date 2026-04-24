import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadCV } from '../src/loader.js';
import { YAMLParseError, ValidationError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(__dirname, 'fixtures', name);

describe('loadCV', () => {
  it('lädt und validiert gültiges YAML', async () => {
    const cv = await loadCV(fixture('valid.de.yaml'));
    expect(cv.personal.firstName).toBe('Alex');
    expect(cv.meta.locale).toBe('de');
  });

  it('leitet Locale aus Dateinamen-Suffix ab (override)', async () => {
    const cv = await loadCV(fixture('valid.de.yaml'));
    expect(cv.meta.locale).toBe('de');
  });

  it('wirft ValidationError bei fehlendem Pflichtfeld', async () => {
    await expect(loadCV(fixture('invalid-missing.de.yaml'))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('wirft YAMLParseError bei kaputtem YAML', async () => {
    await expect(loadCV(fixture('broken.yaml'))).rejects.toBeInstanceOf(YAMLParseError);
  });
});
