import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
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
