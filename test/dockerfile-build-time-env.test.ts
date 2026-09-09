import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `NEXT_PUBLIC_*` values are inlined into the client bundle at BUILD time.
 * Setting one only in the runtime stage — or only in the hosting panel — leaves
 * the server with the value and the browser without it, and the two then
 * disagree about what the app is.
 *
 * For `NEXT_PUBLIC_DEMO_MODE` the split is silent and total: the server refuses
 * every write (`POST /api/save` → 403) while the client believes it is in
 * normal mode, so autosave fires into 403s, no demo banner appears after
 * hydration, the YAML download is missing and switching CVs routes to
 * `/cv/<slug>`. None of it shows in the served HTML, because SSR evaluates the
 * server's value — it appears only after hydration in a real browser, which is
 * why no test in this repo could have caught it and why this one reads the
 * Dockerfile instead.
 *
 * Measured on the built client chunks: with the flag set at build time, zero
 * chunks still reference the name; without it, one chunk references it and
 * resolves `undefined`.
 */
const dockerfile = readFileSync(
  path.join(path.resolve(import.meta.dirname, '..'), 'Dockerfile'),
  'utf8',
);

/** The stage each `ENV` line belongs to, in file order. */
function envsByStage(): Map<string, Set<string>> {
  const stages = new Map<string, Set<string>>();
  let current = '';
  for (const line of dockerfile.split('\n')) {
    const from = /^FROM\s+\S+\s+AS\s+(\S+)/i.exec(line.trim());
    if (from?.[1]) {
      current = from[1];
      stages.set(current, new Set());
      continue;
    }
    const env = /^ENV\s+([A-Z0-9_]+)=/i.exec(line.trim());
    if (env?.[1] && current !== '') stages.get(current)?.add(env[1]);
  }
  return stages;
}

describe('build-time environment in the Dockerfile', () => {
  it('finds the build and run stages', () => {
    // The counter-probe. Every assertion below is over a set built by parsing;
    // if the parse found no stages, they would all pass against nothing.
    const stages = envsByStage();
    expect([...stages.keys()]).toEqual(expect.arrayContaining(['build', 'run']));
    expect(stages.get('build')?.size).toBeGreaterThan(0);
  });

  it.each(['NEXT_PUBLIC_DEMO_MODE', 'NEXT_PUBLIC_APP_ORIGIN'])(
    '%s is set in the build stage, not only at runtime',
    (name) => {
      const stages = envsByStage();
      expect(
        stages.get('build')?.has(name),
        `${name} is a NEXT_PUBLIC_* value, so it is baked into the client bundle by \`next build\`. Setting it only in the run stage (or only in the hosting panel) gives the server one answer and the browser another.`,
      ).toBe(true);
    },
  );

  it('every NEXT_PUBLIC_* the run stage sets is also set in the build stage', () => {
    // Catches the next one too, not just the two that exist today.
    const stages = envsByStage();
    const build = stages.get('build') ?? new Set<string>();
    const runOnly = [...(stages.get('run') ?? [])].filter(
      (n) => n.startsWith('NEXT_PUBLIC_') && !build.has(n),
    );
    expect(runOnly).toEqual([]);
  });
});
