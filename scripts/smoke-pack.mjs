#!/usr/bin/env node
/**
 * Pack -> install -> run smoke test for the four published packages.
 *
 * The release workflow runs `pnpm build` and `pnpm -r test:unit` INSIDE the
 * workspace, where Puppeteer is present as a devDependency of packages/core.
 * A consumer installing from the registry gets no such thing, so a missing
 * runtime dependency is structurally invisible to those gates. This script
 * closes that hole: it packs the real artifacts, installs them into an empty
 * directory, and runs the CLI the way a `npx` user would.
 *
 * Two scenarios, guarding two independent mechanisms:
 *
 *   S1  full install            -> guards Puppeteer being a real dependency
 *   S2  install, then Puppeteer -> guards the lazy import in core/pdf.ts
 *       removed from disk
 *
 * Both are needed. Lazy loading alone leaves `build` broken when nothing
 * installs Puppeteer; declaring the dependency alone leaves every command
 * dying at module load when an install is incomplete.
 *
 * Artifacts come from `pnpm pack`, never `npm pack`: only pnpm rewrites the
 * `workspace:*` protocol into concrete versions. The same tarballs are what
 * the release workflow publishes, so this tests the shipped artifact.
 *
 * Usage:
 *   node scripts/smoke-pack.mjs [--keep]
 *   node scripts/smoke-pack.mjs --tarball-dir <dir>   # test EXISTING tarballs
 *
 * `--tarball-dir` is what makes the release trustworthy: the job that publishes
 * hands in the very tarballs it is about to push, so the bytes that were tested
 * and the bytes that reach npm are the same bytes. Packing twice — once to test,
 * once to publish — verifies an artifact nobody ships.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PACKAGES, REPO, flagValue, packedManifest, resolveTarballs } from './release-packages.mjs';

const KEEP = process.argv.includes('--keep');
const tarballDirArg = flagValue(process.argv, '--tarball-dir');

const results = [];
let failed = false;

function record(scenario, check, expected, actual, detail) {
  const ok = expected === actual;
  if (!ok) failed = true;
  results.push({ scenario, check, expected, actual, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${scenario} / ${check}: expected ${expected}, got ${actual}`);
  if (!ok && detail) console.log(`         ${detail.split('\n').slice(0, 4).join('\n         ')}`);
}

/** Run a command, never throw — the exit code IS the measurement here. */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    ...opts,
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1', ...(opts.env ?? {}) },
  });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

const workdir = mkdtempSync(path.join(tmpdir(), 'cvmake-smoke-'));
const tarballDir = path.join(workdir, 'tarballs');
const appDir = path.join(workdir, 'app');
mkdirSync(tarballDir);
mkdirSync(appDir);

try {
  // ---- obtain the artifacts ---------------------------------------------
  const tarballs = {};
  if (tarballDirArg) {
    // Test tarballs someone else produced — the release path, where these are
    // the exact files about to be published. Validation is shared with the
    // publisher so the test and the publish accept exactly the same artifacts;
    // when they differed, a tarball with a correct FILENAME but a foreign
    // packed name passed the smoke test and would have gone to npm under that
    // foreign name.
    console.log(`\nUsing existing tarballs from ${path.resolve(tarballDirArg)}`);
    const validated = resolveTarballs(tarballDirArg);
    for (const pkg of PACKAGES) {
      tarballs[pkg.name] = validated[pkg.name].path;
      console.log(
        `  ${pkg.name}@${validated[pkg.name].version} -> ${path.basename(validated[pkg.name].path)}`,
      );
    }
  } else {
    console.log(`\nPacking ${PACKAGES.length} packages with pnpm pack...`);
    for (const pkg of PACKAGES) {
      const out = execFileSync(
        'pnpm',
        ['--dir', path.join(REPO, pkg.dir), 'pack', '--pack-destination', tarballDir],
        { encoding: 'utf8', cwd: REPO },
      );
      const tgz = out.trim().split('\n').pop().trim();
      if (!existsSync(tgz))
        throw new Error(`pnpm pack produced no tarball for ${pkg.name}: ${out}`);
      tarballs[pkg.name] = tgz;
      console.log(`  ${pkg.name} -> ${path.basename(tgz)}`);
    }
  }

  // A pnpm-packed tarball must not carry the workspace protocol. npm rejects
  // it on the consumer side with EUNSUPPORTEDPROTOCOL, so a leaked `workspace:*`
  // means we would publish four uninstallable packages.
  for (const [name, tgz] of Object.entries(tarballs)) {
    const manifest = JSON.stringify(packedManifest(tgz));
    record(
      'pack',
      `${name} has no workspace: protocol`,
      'clean',
      manifest.includes('workspace:') ? 'workspace:* leaked' : 'clean',
      manifest,
    );
  }

  // ---- install ----------------------------------------------------------
  // Every internal package is pinned to its local tarball, top-level AND via
  // overrides. Without the overrides npm would happily satisfy the tarballs'
  // internal `0.2.0` ranges from the registry once that version exists — the
  // guard would then test someone else's artifact and stay green.
  const overrides = Object.fromEntries(
    PACKAGES.filter((p) => p.name !== '@codevena/cvmake-cli').map((p) => [
      p.name,
      `file:${tarballs[p.name]}`,
    ]),
  );
  writeFileSync(
    path.join(appDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'cvmake-smoke-consumer',
        version: '1.0.0',
        private: true,
        dependencies: { '@codevena/cvmake-cli': `file:${tarballs['@codevena/cvmake-cli']}` },
        overrides,
      },
      null,
      2,
    )}\n`,
  );

  console.log('\nInstalling packed artifacts into an empty directory...');
  const install = run('npm', ['install', '--no-audit', '--no-fund'], { cwd: appDir });
  if (install.status !== 0) {
    console.log(install.stderr.slice(0, 2000));
    throw new Error(`npm install failed with exit ${install.status}`);
  }

  // Prove the four packages came from disk, not from the registry.
  //
  // Registry entries are `https://registry.npmjs.org/<pkg>/-/<pkg>-<v>.tgz`, so
  // "ends with .tgz" matches BOTH sources and would make this check incapable of
  // ever going red — the one thing it exists to catch. The protocol is the only
  // reliable discriminator. Once 0.2.0 is on npm, a broken `overrides` block
  // would otherwise let the smoke test validate someone else's artifact.
  //
  // Every matching entry is checked, not just the first: npm may place a nested
  // second copy under another package's node_modules, and that copy can come
  // from the registry while the hoisted one is local.
  const lock = JSON.parse(readFileSync(path.join(appDir, 'package-lock.json'), 'utf8'));
  for (const pkg of PACKAGES) {
    const entries = Object.entries(lock.packages ?? {}).filter(([k]) =>
      k.endsWith(`node_modules/${pkg.name}`),
    );
    const sources = entries.map(([k, v]) => ({ path: k, resolved: v?.resolved }));
    // An entry without `resolved` is UNKNOWN, never "local". Defaulting an
    // absent discriminator to the passing value is the same failure shape as
    // the `.tgz` suffix check it replaced: the check reports success precisely
    // when it learned nothing.
    const fromRegistry = sources.filter((s) => s.resolved?.startsWith('http'));
    const unknown = sources.filter((s) => !s.resolved);
    record(
      'install',
      `${pkg.name} resolved from local tarball`,
      'local',
      entries.length === 0
        ? 'not installed'
        : fromRegistry.length > 0
          ? 'registry'
          : unknown.length > 0
            ? 'unknown source'
            : 'local',
      sources.map((s) => `${s.path}: ${s.resolved ?? '(no resolved field)'}`).join('\n'),
    );
  }

  const cli = path.join(appDir, 'node_modules', '.bin', 'cvmake');
  const coreDir = path.join(appDir, 'node_modules', '@codevena', 'cvmake-core');

  // ---- S1: full install -------------------------------------------------
  // Guards: Puppeteer is a real, installed dependency resolvable FROM core.
  // core is where `import('puppeteer')` is evaluated, so that is where the
  // resolution has to succeed — a hoisted copy owned by some other package
  // is luck, not a contract.
  console.log('\nS1 — full install:');
  const resolver = run(
    process.execPath,
    ['-e', "require.resolve('puppeteer'); console.log('resolved')"],
    { cwd: coreDir },
  );
  record('S1', 'puppeteer resolvable from core', 0, resolver.status, resolver.stderr);

  for (const args of [['--help'], ['list-templates']]) {
    const r = run(cli, args, { cwd: appDir });
    record('S1', `cvmake ${args.join(' ')}`, 0, r.status, r.stderr);
  }

  const cvPath = path.join(appDir, 'cv.yaml');
  const init = run(cli, ['init', cvPath], { cwd: appDir });
  record('S1', 'cvmake init', 0, init.status, init.stderr);

  // ---- S2: Puppeteer removed -------------------------------------------
  // Guards: the import in core/pdf.ts is lazy. With Puppeteer gone, commands
  // that never render a PDF must still work, and `build` must fail with our
  // own diagnostic rather than a raw module-resolution stack trace.
  console.log('\nS2 — Puppeteer removed from node_modules:');
  rmSync(path.join(appDir, 'node_modules', 'puppeteer'), { recursive: true, force: true });

  const helpNoPuppeteer = run(cli, ['--help'], { cwd: appDir });
  record(
    'S2',
    'cvmake --help without puppeteer',
    0,
    helpNoPuppeteer.status,
    helpNoPuppeteer.stderr,
  );

  if (existsSync(cvPath)) {
    const build = run(cli, ['build', cvPath, '-o', path.join(appDir, 'out.pdf')], { cwd: appDir });
    record(
      'S2',
      'cvmake build fails without puppeteer',
      'non-zero',
      build.status === 0 ? 'zero' : 'non-zero',
      build.stderr,
    );
    // Assert POSITIVELY on our own wording, not merely on the absence of
    // ERR_MODULE_NOT_FOUND. A build that died at template bootstrap or on a
    // malformed cv.yaml would also exit non-zero and also not contain that
    // string — so the negative check alone proves nothing about the lazy
    // import. Matching the real message is what ties this check to the
    // mechanism it claims to guard.
    const combined = `${build.stdout}${build.stderr}`;
    record(
      'S2',
      'build failed with our own Puppeteer diagnostic',
      'our diagnostic',
      /needs Puppeteer/i.test(combined) && /Original error/i.test(combined)
        ? 'our diagnostic'
        : `other failure: ${combined.trim().split('\n')[0] ?? '(no output)'}`,
      combined,
    );
    record(
      'S2',
      'build error is not a raw ERR_MODULE_NOT_FOUND',
      'wrapped',
      combined.includes('ERR_MODULE_NOT_FOUND') ? 'raw module error' : 'wrapped',
      combined,
    );
  } else {
    record('S2', 'cv.yaml fixture from init', 'present', 'missing', 'init did not produce a file');
  }
} finally {
  if (KEEP) {
    console.log(`\nWorkdir kept at ${workdir}`);
  } else {
    rmSync(workdir, { recursive: true, force: true });
  }
}

console.log(
  `\n${failed ? 'SMOKE FAILED' : 'SMOKE PASSED'} — ${results.filter((r) => !r.ok).length}/${results.length} checks failed`,
);
process.exit(failed ? 1 : 0);
