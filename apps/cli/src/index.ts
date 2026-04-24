import { Command } from 'commander';
import { runBuild } from './commands/build.js';
import { runValidate } from './commands/validate.js';

const program = new Command();
program.name('cvmake').description('cvMake CLI').version('0.0.0');

program
  .command('build')
  .argument('<yaml>', 'Pfad zur CV-YAML')
  .option('-t, --template <id>', 'Template-ID (default: aus YAML rendering.template)')
  .option('-p, --palette <id>', 'Palette-ID (default: aus YAML)')
  .option('-o, --output <path>', 'Output-PDF-Pfad', 'out/cv.pdf')
  .action(async (yaml: string, opts: { template?: string | undefined; palette?: string | undefined; output: string }) => {
    await runBuild({ yaml, template: opts.template, palette: opts.palette, output: opts.output });
  });

program
  .command('validate')
  .argument('<yaml>', 'Pfad zur YAML')
  .action(async (yaml) => {
    process.exit(await runValidate(yaml));
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
