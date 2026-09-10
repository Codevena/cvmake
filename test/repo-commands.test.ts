import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The PR checklist told every contributor to run `pnpm test`, and `pnpm test`
 * mapped to a turbo task that did not exist — `could not find task 'test' in
 * project`, exit 1. It had been wrong long enough to reach an audit.
 *
 * Documentation that names a command is a promise the repository can keep or
 * break, so it is checked like any other contract.
 */
const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const turbo = JSON.parse(readFileSync(path.join(root, 'turbo.json'), 'utf8')) as {
  tasks: Record<string, unknown>;
};

describe('the commands the repository tells people to run', () => {
  it('every root script that delegates to turbo names a task turbo has', () => {
    // This is the exact shape of the bug: a script exists, so `pnpm run` finds
    // it, and it fails one level down where nobody looked.
    const missing: string[] = [];
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      const m = /^turbo run ([\w:.-]+)/.exec(cmd);
      if (m?.[1] && !(m[1] in turbo.tasks)) missing.push(`${name} -> ${cmd}`);
    }
    expect(missing).toEqual([]);
  });

  it('every pnpm command in the PR checklist resolves to something that exists', () => {
    const tpl = readFileSync(path.join(root, '.github/PULL_REQUEST_TEMPLATE.md'), 'utf8');
    const cmds = [...tpl.matchAll(/`pnpm ([^`]+)`/g)].map((m) => m[1]?.trim() ?? '');
    // The counter-probe: if the parse finds nothing, the assertion below is
    // vacuous and the checklist could name anything at all.
    expect(cmds.length).toBeGreaterThan(3);
    for (const cmd of cmds) {
      const script = /^(?:-r |--filter \S+ )?(?:run )?([\w:.-]+)/.exec(cmd)?.[1];
      if (!script || script === 'exec') continue;
      const known = script in pkg.scripts || script in turbo.tasks;
      expect(
        known,
        `the PR checklist says \`pnpm ${cmd}\`, which is not a script or a turbo task`,
      ).toBe(true);
    }
  });

  it('every living README states the real palette numbers', async () => {
    // A published README promised "3+ color palettes" per template. Three ship
    // two. My first fix caught one of THREE places that said it — including
    // `apps/cli/README.md`, which `files` puts inside the published
    // @codevena/cvmake-cli. A guard that reads one file looks complete and is
    // not, so this one sweeps every markdown file the repo tracks.
    const { bootstrapTemplates, listTemplates } = (await import(
      pathToFileURL(path.join(root, 'packages/templates/dist/index.js')).href
    )) as typeof import('@codevena/cvmake-templates');
    bootstrapTemplates();
    const counts = listTemplates().map((t) => t.palettes.length);
    expect(counts.length).toBeGreaterThan(0);
    const min = Math.min(...counts);
    const total = counts.reduce((a, b) => a + b, 0);

    // `docs/superpowers/` is deliberately excluded: those are records of what
    // was planned on a given day. Editing them to match today would falsify
    // the record, which is worse than a stale sentence nobody ships.
    const docs = execFileSync('git', ['ls-files', '*.md'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter((f) => f !== '' && !f.startsWith('docs/superpowers/'));
    expect(docs.length).toBeGreaterThan(3);

    const offenders: string[] = [];
    for (const rel of docs) {
      const text = readFileSync(path.join(root, rel), 'utf8');
      for (const m of text.matchAll(/(\d+)\+ color palettes/g)) {
        // An "N+" promise has to hold for the SMALLEST template, not for the
        // one the author happened to open. That is the mistake that produced
        // the original claim.
        if (Number(m[1]) > min) offenders.push(`${rel}: promises ${m[1]}+, smallest has ${min}`);
      }
      for (const m of text.matchAll(/(\d+) across the twelve/g)) {
        if (Number(m[1]) !== total) {
          offenders.push(`${rel}: says ${m[1]} palettes, registry has ${total}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every node script the checklist names is on disk', () => {
    const tpl = readFileSync(path.join(root, '.github/PULL_REQUEST_TEMPLATE.md'), 'utf8');
    const files = [...tpl.matchAll(/`node (scripts\/[\w.-]+)`/g)].map((m) => m[1] ?? '');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(existsSync(path.join(root, f)), `${f} is named in the checklist but missing`).toBe(
        true,
      );
    }
  });
});
