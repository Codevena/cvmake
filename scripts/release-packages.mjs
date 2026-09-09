/**
 * The publish set, and the one place that decides whether a directory of
 * tarballs is fit to be tested or published.
 *
 * Both `smoke-pack.mjs` and `publish-packages.mjs` import this. They used to
 * carry their own copies of the package list and their own, subtly different
 * acceptance rules — which is how a tarball could pass the smoke test and be
 * published under a DIFFERENT package name: the filename looked right, and
 * nobody checked the name inside.
 *
 * Validation is a PREFLIGHT: the whole set is checked before the caller acts on
 * any single package. Validating inside a publish loop means the fourth
 * package's problem is discovered after the first three are already on npm, and
 * npm versions cannot be withdrawn.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Dependency order: a package is published after everything it depends on. */
export const PACKAGES = [
  { name: '@codevena/cvmake-schema', dir: 'packages/schema' },
  { name: '@codevena/cvmake-core', dir: 'packages/core' },
  { name: '@codevena/cvmake-templates', dir: 'packages/templates' },
  { name: '@codevena/cvmake-cli', dir: 'apps/cli' },
];

export function manifestVersion(dir) {
  return JSON.parse(readFileSync(path.join(REPO, dir, 'package.json'), 'utf8')).version;
}

/**
 * Read the manifest out of a packed tarball — after proving the archive has
 * only ONE manifest to read.
 *
 * `tar -xOf <tgz> package/package.json` answers "what does the file at that
 * path say", which is NOT the same question as "what will npm publish". npm
 * strips the leading path component when it extracts, so a second manifest
 * under a different root — `other/package.json` — lands on `package.json` and
 * wins. An archive carrying both passed every name and version check here while
 * real npm resolved it to a completely different package.
 *
 * So the structure is validated first: every entry under a single `package/`
 * root, exactly one regular `package/package.json`, no links standing in for
 * it, no traversal. Only then is the manifest read.
 */
export function packedManifest(tgz) {
  const label = path.basename(tgz);

  // `tar -tf` prints one NAME per line and nothing else. The verbose form
  // (`-tvf`) is a human listing whose columns shift — tar prints a year
  // instead of HH:MM once a file is older than six months, and a parser tuned
  // to the timestamp then mistakes metadata for the filename. Parsing that
  // rejected perfectly valid tarballs.
  const names = execFileSync('tar', ['-tf', tgz], { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== './');

  const manifests = [];
  for (const name of names) {
    if (name.startsWith('/') || name.split('/').includes('..')) {
      throw new Error(`${label}: archive contains an unsafe path (${name})`);
    }
    if (!name.startsWith('package/')) {
      throw new Error(
        `${label}: entry outside the package/ root (${name}). npm strips the leading component on extract, so a second root silently replaces the manifest.`,
      );
    }
    if (name.replace(/\/$/, '') === 'package/package.json') manifests.push(name);
  }

  if (manifests.length !== 1) {
    throw new Error(
      `${label}: expected exactly one package/package.json, found ${manifests.length}`,
    );
  }

  // Type check on the single known entry: only the first character of one line
  // is read, so no column parsing is involved. A symlinked manifest reads fine
  // through `tar -xO` but is not what lands on disk.
  const typeLine = execFileSync('tar', ['-tvf', tgz, 'package/package.json'], {
    encoding: 'utf8',
  }).trim();
  if (typeLine && typeLine[0] !== '-') {
    throw new Error(`${label}: package.json is not a regular file (type '${typeLine[0]}')`);
  }

  return JSON.parse(
    execFileSync('tar', ['-xOf', tgz, 'package/package.json'], { encoding: 'utf8' }),
  );
}

/**
 * Read a `--flag value` pair, rejecting a flag whose value is missing or is
 * itself a flag. Treating `--tarball-dir` with no value as "flag absent" made
 * both scripts silently fall back to packing their own artifacts — the exact
 * behaviour the flag exists to prevent.
 */
export function flagValue(argv, flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  if (value === undefined || value === '' || value.startsWith('--')) {
    // An empty string is not "flag absent" either: `--tarball-dir ""` used to
    // fall through to the packing fallback, which is the behaviour the flag
    // exists to prevent.
    throw new Error(`${flag} requires a non-empty value`);
  }
  return value;
}

/**
 * Resolve and validate one tarball per expected package.
 *
 * Rejects, for the whole set and before the caller does anything:
 *  - a missing package
 *  - more than one candidate for a package (which file would win? `.find()`
 *    picked the first, silently)
 *  - a packed NAME that is not the expected one — the identity check; a
 *    correctly named FILE says nothing about what npm will publish, because
 *    npm reads the name from the manifest inside
 *  - a packed version that disagrees with the repo manifest
 *  - a leaked `workspace:*` protocol, which npm rejects on the consumer side
 *
 * @returns {Record<string, {path: string, version: string}>} keyed by package name
 */
export function resolveTarballs(dir) {
  const resolved = path.resolve(dir);
  if (!statSync(resolved, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`--tarball-dir is not a directory: ${resolved}`);
  }
  const present = readdirSync(resolved).filter((f) => f.endsWith('.tgz'));
  const problems = [];

  // Read every archive ONCE and index by the name it declares. The previous
  // shape re-opened every tarball for every expected package (16 tar calls for
  // four packages) and reported an unreadable archive four times over.
  const byName = new Map();
  for (const file of present) {
    const full = path.join(resolved, file);
    let manifest;
    try {
      manifest = packedManifest(full);
    } catch (err) {
      // packedManifest already prefixes the filename; don't repeat it.
      problems.push(err.message);
      continue;
    }
    const entry = { file, full, manifest };
    const list = byName.get(manifest.name);
    if (list) list.push(entry);
    else byName.set(manifest.name, [entry]);
  }

  const out = {};
  for (const pkg of PACKAGES) {
    const candidates = byName.get(pkg.name) ?? [];
    if (candidates.length === 0) {
      problems.push(`${pkg.name}: no tarball in ${resolved} declares this package name`);
      continue;
    }
    if (candidates.length > 1) {
      problems.push(
        `${pkg.name}: ${candidates.length} tarballs declare this name (${candidates
          .map((c) => c.file)
          .join(', ')}) — refusing to guess`,
      );
      continue;
    }
    const [only] = candidates;
    const expectedVersion = manifestVersion(pkg.dir);
    if (only.manifest.version !== expectedVersion) {
      problems.push(
        `${pkg.name}: tarball is ${only.manifest.version} but the repo manifest says ${expectedVersion} (${only.file})`,
      );
      continue;
    }
    if (JSON.stringify(only.manifest).includes('workspace:')) {
      problems.push(`${pkg.name}: tarball still contains the workspace: protocol (${only.file})`);
      continue;
    }
    out[pkg.name] = { path: only.full, version: only.manifest.version };
  }

  // An unexpected tarball is a PROBLEM, not a note. It means the packing step
  // and this list have drifted apart — and a warning that is skipped whenever
  // something else already failed is not a signal anyone can rely on.
  const expected = new Set(PACKAGES.map((p) => p.name));
  for (const [name, entries] of byName) {
    if (!expected.has(name)) {
      problems.push(
        `unexpected package in the directory: ${name} (${entries.map((e) => e.file).join(', ')})`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Tarball directory is not publishable:\n  - ${problems.join('\n  - ')}`);
  }
  return out;
}
