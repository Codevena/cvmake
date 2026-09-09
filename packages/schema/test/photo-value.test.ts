import { describe, expect, it } from 'vitest';
import { CVDataSchema } from '../src/cv.js';

/**
 * The photo field is the one attacker-controlled string that reaches an
 * `<img src>` in a document the server renders in a real browser.
 *
 * The rejected values fall into two groups, and only the first is the attack
 * that motivated this guard: the `http(s)` and control-character rows were
 * measured making a real server-side request, while `javascript:`, `file:`,
 * `data:text/html`, UNC and a bare `a:b.jpg` never fetch anything. Those are
 * refused because the field has exactly two useful shapes and everything else
 * is a value nobody can render — not because each one is an exploit.
 */
function parsePhoto(photo: string) {
  return CVDataSchema.safeParse({
    meta: { locale: 'en' },
    personal: { firstName: 'A', lastName: 'B', photo, contacts: {} },
    experience: [],
    education: [],
    rendering: { template: 'swiss' },
  });
}

describe('photo values that must be refused', () => {
  it.each([
    ['http://169.254.169.254/latest/meta-data/x.jpg', 'plain http'],
    ['https://evil.example/x.jpg', 'plain https'],
    ['ht\ttp://169.254.169.254/x.jpg', 'tab inside the scheme'],
    ['htt\np://169.254.169.254/x.jpg', 'newline inside the scheme'],
    ['htt\rp://169.254.169.254/x.jpg', 'carriage return inside the scheme'],
    ['\u0001http://169.254.169.254/x.jpg', 'leading control character'],
    [' http://169.254.169.254/x.jpg', 'leading space'],
    ['//evil.example/x.jpg', 'protocol-relative'],
    ['\\\\evil.example\\x.jpg', 'UNC-style'],
    ['file:///etc/passwd', 'file scheme'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['data:text/html,<b>x</b>', 'non-image data URI'],
    ['a:b.jpg', 'colon in the first path segment reads as a scheme'],
  ])('rejects %s (%s)', (photo) => {
    expect(parsePhoto(photo).success).toBe(false);
  });

  it('the control characters are the whole point: without stripping them the URL parser sees a scheme', () => {
    // This is the number that makes the tab/newline rows non-vacuous. A
    // predicate reading the raw string finds no scheme in "ht\ttp://…";
    // Chromium resolves the very same value to http://169.254.169.254/.
    expect(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test('ht\ttp://169.254.169.254/')).toBe(false);
    expect(new URL('ht\ttp://169.254.169.254/x.jpg').protocol).toBe('http:');
  });
});

describe('photo values that must keep working', () => {
  it.each([
    ['', 'empty — what the editor writes when a photo is removed'],
    ['photos/example-lena.webp', 'relative path'],
    ['/photos/example.jpg', 'rooted path from the upload API'],
    ['photos/a:b.jpg', 'a colon after a slash is not a scheme'],
    ['data:image/png;base64,AAAA', 'embedded image'],
    ['DATA:image/png;base64,AAAA', 'embedded image, uppercase scheme'],
    ['data:image/svg+xml,<svg/>', 'embedded svg — renders in secure static mode'],
  ])('accepts %s (%s)', (photo) => {
    expect(parsePhoto(photo).success).toBe(true);
  });

  it('accepts a CV with no photo key at all', () => {
    const parsed = CVDataSchema.safeParse({
      meta: { locale: 'en' },
      personal: { firstName: 'A', lastName: 'B', contacts: {} },
      experience: [],
      education: [],
      rendering: { template: 'swiss' },
    });
    expect(parsed.success).toBe(true);
  });
});
