#!/usr/bin/env node
/**
 * Publish the four packages from pnpm-produced tarballs.
 *
 * Why the two-tool split: the publish needs BOTH, and neither can do it alone.
 *
 *   pnpm pack    rewrites the `workspace:*` protocol into concrete versions.
 *                `npm pack` does not — it leaves `workspace:*` in the manifest,
 *                which npm then rejects on the consumer side with
 *                EUNSUPPORTEDPROTOCOL. Publishing from the package directory
 *                with npm would ship four uninstallable packages.
 *
 *   npm publish  performs OIDC trusted publishing. pnpm 9 cannot; support
 *                landed in pnpm 10. Since the workflow no longer carries an
 *                NPM_TOKEN, `pnpm publish` has no way to authenticate at all.
 *
 * So: pack with pnpm, publish the resulting tarball with npm.
 *
 * NOTHING IRREVERSIBLE HAPPENS BEFORE THE WHOLE SET IS CHECKED. Both the
 * artifacts and the registry state are established for all four packages up
 * front — because the failure this guards against is a HALF release: three
 * packages on npm and the fourth rejected, with no way to take the three back.
 * That holds for the supplied-tarball path and for the local packing fallback;
 * they differ only in where the tarballs come from.
 *
 * Idempotent but NOT fail-open. Re-running the same tag after a partial failure
 * skips what is already in the registry and publishes only the rest — but a run
 * that neither published nor found anything is a failure, not a success. A green
 * run that did nothing is exactly the outcome nobody notices.
 *
 * What this CANNOT check: authorisation. A trusted publisher configured for
 * three of the four packages lets three publish and fails on the fourth, and
 * `npm publish --dry-run` does not reveal it because it never touches registry
 * auth. Verified on npmjs.com for all four packages on 2026-09-09; re-check if
 * the package set changes.
 *
 * Usage:
 *   node scripts/publish-packages.mjs --expect-version 0.2.0 [--dry-run]
 *   node scripts/publish-packages.mjs --expect-version 0.2.0 --tarball-dir dist-tarballs
 *
 * `--expect-version` is mandatory for a real publish: it is the only thing
 * tying the artifacts to the tag that triggered the run. `--tarball-dir`
 * publishes tarballs produced and smoke-tested earlier in the workflow, so the
 * bytes that were tested are the bytes that reach npm. A resumed run needs the
 * COMPLETE set of four tarballs, not only the missing ones.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  PACKAGES,
  REPO,
  flagValue,
  manifestVersion,
  resolveTarballs,
} from './release-packages.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const expectVersion = flagValue(process.argv, '--expect-version');
const suppliedDir = flagValue(process.argv, '--tarball-dir');

// ---- version gate -------------------------------------------------------
// The workflow triggers on a tag, but `npm publish` takes the version from the
// manifest, not from the tag. If they disagree, the release silently ships a
// version nobody asked for — and npm versions cannot be replaced.
//
// The flag is MANDATORY for a real publish. Making it optional meant a hand
// invocation without it skipped the gate entirely and published whatever the
// manifests happened to say — the gate would be there and simply not run.
if (!DRY_RUN && !expectVersion) {
  console.error(
    'Refusing to publish without --expect-version <x.y.z>. The version gate is the only ' +
      'thing tying the published artifacts to the tag that triggered this run.',
  );
  process.exit(1);
}
if (expectVersion) {
  const mismatches = PACKAGES.filter((p) => manifestVersion(p.dir) !== expectVersion);
  if (mismatches.length > 0) {
    console.error(`Tag says ${expectVersion}, but these manifests disagree:`);
    for (const p of mismatches) console.error(`  ${p.name}: ${manifestVersion(p.dir)}`);
    console.error('\nAll four packages publish in lockstep. Aborting before anything is pushed.');
    process.exit(1);
  }
  console.log(`Version gate: all four manifests are at ${expectVersion}.`);
}

/** Is this exact name@version already in the registry? */
function alreadyPublished(name, version) {
  const r = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim() === version) return true;
  const err = r.stderr ?? '';
  // E404 is the expected "not published yet" answer. Anything else (network,
  // auth, registry outage) must not be mistaken for it — treating a lookup
  // failure as "absent" would turn a broken registry into a duplicate publish
  // attempt, and treating it as "present" would silently skip a package.
  if (err.includes('E404') || err.includes('404 Not Found')) return false;
  if (r.status !== 0) {
    throw new Error(`Cannot determine whether ${name}@${version} exists: ${err.trim()}`);
  }
  return false;
}

const ownTarballDir = suppliedDir ? null : mkdtempSync(path.join(tmpdir(), 'cvmake-publish-'));
const tarballDir = suppliedDir ? path.resolve(suppliedDir) : ownTarballDir;
let published = 0;
let skipped = 0;

try {
  // ---- preflight: artifacts ---------------------------------------------
  // The local fallback packs everything FIRST and then runs the same validation
  // as a supplied directory. Packing and publishing one package at a time would
  // reintroduce the half-release: a pack failure on the third package would
  // leave the first two irreversibly on npm.
  if (!suppliedDir) {
    console.log(`Packing ${PACKAGES.length} packages locally (no --tarball-dir given)...`);
    for (const pkg of PACKAGES) {
      const out = execFileSync(
        'pnpm',
        ['--dir', path.join(REPO, pkg.dir), 'pack', '--pack-destination', tarballDir],
        { encoding: 'utf8', cwd: REPO },
      );
      const tgz = out.trim().split('\n').pop().trim();
      if (!existsSync(tgz)) throw new Error(`pnpm pack produced no tarball for ${pkg.name}`);
    }
  }

  const validated = resolveTarballs(tarballDir);
  console.log(
    `Preflight: ${PACKAGES.length} tarballs validated (single package/ root, one manifest, name, version, no workspace: protocol).`,
  );

  // ---- preflight: registry ----------------------------------------------
  // Asked for all four before publishing any, so a network failure on the third
  // lookup cannot strand the first two on npm.
  const alreadyThere = new Map();
  for (const pkg of PACKAGES) {
    alreadyThere.set(pkg.name, alreadyPublished(pkg.name, manifestVersion(pkg.dir)));
  }
  const pending = PACKAGES.filter((p) => !alreadyThere.get(p.name));
  console.log(
    `Preflight: ${pending.length} package(s) to publish, ${PACKAGES.length - pending.length} already in the registry.`,
  );

  // ---- publish ------------------------------------------------------------
  for (const pkg of PACKAGES) {
    const version = manifestVersion(pkg.dir);
    if (alreadyThere.get(pkg.name)) {
      console.log(`= ${pkg.name}@${version} already in registry — skipping`);
      skipped += 1;
      continue;
    }
    const tgz = validated[pkg.name].path;
    const args = ['publish', tgz, '--provenance', '--access', 'public'];
    if (DRY_RUN) args.push('--dry-run');
    console.log(`+ publishing ${pkg.name}@${version}${DRY_RUN ? ' (dry run)' : ''}`);
    const r = spawnSync('npm', args, { stdio: 'inherit' });
    if (r.status !== 0) {
      throw new Error(
        `npm publish failed for ${pkg.name}@${version} (exit ${r.status}). ${published} package(s) were already published in this run; re-running the same tag will skip those and retry the rest — with the complete set of four tarballs.`,
      );
    }
    published += 1;
  }
} finally {
  // Only clean up what we created. A supplied directory belongs to the caller
  // — deleting it would destroy the artifacts a retry needs.
  if (ownTarballDir) rmSync(ownTarballDir, { recursive: true, force: true });
}

console.log(`\npublished: ${published}, already present: ${skipped}`);

// Safety net, unreachable on today's control flow: the loop leaves every
// package either published, skipped, or thrown, so the counts always add up
// to PACKAGES.length. It is kept as a regression guard for the day someone
// adds a `continue` that forgets to count — a release job that reports success
// while publishing nothing is the failure nobody notices.
if (published === 0 && skipped === 0) {
  console.error(
    'Nothing was published and nothing was found in the registry — treating as failure.',
  );
  process.exit(1);
}
if (published + skipped !== PACKAGES.length) {
  console.error(`Expected ${PACKAGES.length} packages accounted for, got ${published + skipped}.`);
  process.exit(1);
}
