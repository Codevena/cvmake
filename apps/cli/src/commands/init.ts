import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

export interface InitArgs {
  output: string;
  lang: string;
  force?: boolean | undefined;
}

const STARTER_EN = `# cvmake — your CV as one YAML file.
# Edit the fields below, then render it:  cvmake build cv.yaml
# Browse the 12 templates with:           cvmake list-templates
# Docs & schema: https://github.com/Codevena/cvmake
#
# Tip: keep cv.en.yaml and cv.de.yaml side by side for a bilingual CV.

meta:
  locale: en

personal:
  firstName: Jane
  lastName: Doe
  title: 'Your role · Specialty · Focus'
  # photo: photos/jane.jpg        # optional — relative to this file, or /photos/<name>
  contacts:
    email: jane.doe@example.com
    # phone: '+1 555 0100'
    # website: https://janedoe.example.com
    github: janedoe               # bare handle → rendered as github.com/janedoe
    linkedin: janedoe
    location: 'Remote'

summary: >-
  One or two sentences about who you are and what you do — the elevator pitch at
  the top of your CV. Keep it tight and specific.

experience:
  - title: 'Your job title'
    company: 'Company'
    location: 'City'
    startDate: '2022-01'          # YYYY, YYYY-MM or YYYY-MM-DD
    # endDate: '2024-06'          # omit endDate for "present"
    bullets:
      - 'What you did and the impact you had — use numbers where you can'
      - 'Another concrete achievement'
    tags: [Skill, Tool]

education:
  - degree: 'Your degree'
    institution: 'University'
    location: 'City'
    startDate: '2016-09'
    endDate: '2019-06'

skills:
  stack: [TypeScript, React, PostgreSQL]
  # Or group them into categories instead of (or in addition to) a flat stack:
  # categorized:
  #   Frontend: [React, Tailwind]
  #   Backend: [Node.js, Prisma]

languages:
  - name: English
    level: native                 # native | C2 | C1 | B2 | B1 | A2 | A1 | basic
  - name: German
    level: B2

rendering:
  template: classic-serif         # run \`cvmake list-templates\` to see all 12
  # palette: classic-serif-default
`;

const STARTER_DE = `# cvmake — dein Lebenslauf als eine YAML-Datei.
# Felder unten anpassen, dann rendern:  cvmake build cv.yaml
# Alle 12 Templates anzeigen mit:        cvmake list-templates
# Doku & Schema: https://github.com/Codevena/cvmake
#
# Tipp: cv.de.yaml und cv.en.yaml nebeneinander für einen zweisprachigen CV.

meta:
  locale: de

personal:
  firstName: Erika
  lastName: Mustermann
  title: 'Deine Rolle · Schwerpunkt · Fokus'
  # photo: photos/erika.jpg       # optional — relativ zu dieser Datei oder /photos/<name>
  contacts:
    email: erika.mustermann@example.com
    # phone: '+49 30 0000000'
    # website: https://erika.example.com
    github: erikam                # reines Handle → wird als github.com/erikam gerendert
    linkedin: erikam
    location: 'Remote'

summary: >-
  Ein bis zwei Sätze darüber, wer du bist und was du machst — der Elevator-Pitch
  oben im Lebenslauf. Kurz und konkret halten.

experience:
  - title: 'Deine Position'
    company: 'Firma'
    location: 'Stadt'
    startDate: '2022-01'          # JJJJ, JJJJ-MM oder JJJJ-MM-TT
    # endDate: '2024-06'          # endDate weglassen für "heute"
    bullets:
      - 'Was du gemacht und welche Wirkung du erzielt hast — mit Zahlen, wo möglich'
      - 'Ein weiterer konkreter Erfolg'
    tags: [Skill, Tool]

education:
  - degree: 'Dein Abschluss'
    institution: 'Hochschule'
    location: 'Stadt'
    startDate: '2016-09'
    endDate: '2019-06'

skills:
  stack: [TypeScript, React, PostgreSQL]
  # Oder in Kategorien gruppieren (statt oder zusätzlich zum flachen stack):
  # categorized:
  #   Frontend: [React, Tailwind]
  #   Backend: [Node.js, Prisma]

languages:
  - name: Deutsch
    level: native                 # native | C2 | C1 | B2 | B1 | A2 | A1 | basic
  - name: Englisch
    level: B2

rendering:
  template: classic-serif         # \`cvmake list-templates\` zeigt alle 12
  # palette: classic-serif-default
`;

/**
 * Scaffolds a commented, schema-valid starter CV YAML so a first-time user has
 * something to render immediately (closes the "installed → first PDF" gap).
 * Returns a process exit code.
 */
export function runInit(args: InitArgs): number {
  const lang = args.lang === 'de' ? 'de' : args.lang === 'en' ? 'en' : null;
  if (!lang) {
    console.error(pc.red(`✗ unknown language: ${args.lang} (expected 'de' or 'en')`));
    return 1;
  }
  const target = path.resolve(args.output);
  if (existsSync(target) && !args.force) {
    console.error(pc.red(`✗ ${args.output} already exists — use --force to overwrite`));
    return 1;
  }
  writeFileSync(target, lang === 'de' ? STARTER_DE : STARTER_EN, 'utf8');
  console.warn(pc.green(`✓ wrote ${args.output}`));
  console.warn(`  next: ${pc.bold(`cvmake build ${args.output}`)}`);
  return 0;
}
