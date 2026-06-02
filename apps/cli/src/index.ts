import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';
import { runBuild, runBuildAll } from './commands/build.js';
import { runListTemplates } from './commands/list-templates.js';
import { runValidate } from './commands/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
  version: string;
};

const program = new Command();
program
  .name('cvmake')
  .description('cvmake — fork-friendly OSS CV builder. YAML in, PDF out.')
  .version(pkg.version);

program
  .command('build')
  .argument('<yaml>', 'Pfad zur CV-YAML')
  .option('-t, --template <id>', 'Template-ID (default: aus YAML rendering.template)')
  .option('-p, --palette <id>', 'Palette-ID (default: aus YAML)')
  .option('-o, --output <path>', 'Output-PDF-Pfad', 'out/cv.pdf')
  .action(
    async (
      yaml: string,
      opts: { template?: string | undefined; palette?: string | undefined; output: string },
    ) => {
      await runBuild({ yaml, template: opts.template, palette: opts.palette, output: opts.output });
    },
  );

program
  .command('validate')
  .argument('<yaml>', 'Pfad zur YAML')
  .action(async (yaml) => {
    process.exit(await runValidate(yaml));
  });

program
  .command('list-templates')
  .description('listet alle Templates mit Paletten')
  .action(() => process.exit(runListTemplates()));

program
  .command('build-all')
  .description('baut alle data/cvs/*.yaml')
  .option('-d, --dir <path>', 'Verzeichnis', 'data/cvs')
  .option('-o, --output <path>', 'Output-Ordner', 'out')
  .action(async (opts) => {
    await runBuildAll(opts.dir, opts.output);
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  // The most common first-run failure is a missing Chromium download — give an
  // actionable hint instead of a raw Puppeteer "Could not find Chrome" string.
  if (/could not find\s+(chrome|chromium)|browser was not found/i.test(err.message)) {
    console.error(
      '\nChromium is required for PDF rendering but was not found.\n' +
        'Install it once with:  pnpm exec puppeteer browsers install chrome',
    );
  }
  process.exit(1);
});
