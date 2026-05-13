# @codevena/cvmake-cli

> YAML in, PDF out. The official [cvmake](https://github.com/Codevena/cvmake) CLI.

Build production-quality CV PDFs from a plain-text YAML file. 12 polished
templates, multiple color palettes each, multilingual.

**Live demo + web editor:** https://cvmake.codevena.dev

## Quick start

```bash
# Get an example to start from
curl -O https://raw.githubusercontent.com/Codevena/cvmake/main/data/cvs/example.en.yaml
mv example.en.yaml cv.yaml

# Open cv.yaml in your editor, fill in your data

# Render
npx @codevena/cvmake-cli build cv.yaml
# → out/cv.pdf
```

The first invocation downloads Chromium (~150 MB, one-time) — required
for high-fidelity PDF rendering. Subsequent runs are instant.

## Commands

```bash
cvmake build <cv.yaml> [-t <template>] [-p <palette>] [-o <output.pdf>]
cvmake validate <cv.yaml>
cvmake list-templates
cvmake build-all [-d <dir>] [-o <out>]   # render every YAML in a directory
```

Default output: `out/cv.pdf`.

## Templates

12 templates ship with the CLI:

`classic-serif`, `modern-minimal`, `corporate`, `creative-accent`,
`editorial`, `academic`, `tech-dev`, `monochrome-dark`, `swiss`,
`bauhaus`, `noir`, `magazine`.

Each template has 3+ color palettes. Specify both in YAML:

```yaml
rendering:
  template: bauhaus
  palette: bauhaus-primary
```

…or override on the command line:

```bash
npx @codevena/cvmake-cli build cv.yaml --template noir --palette noir-gold
```

See [the showcase](https://cvmake.codevena.dev) for live previews of
every template + palette.

## YAML schema

The full schema is published as `@codevena/cvmake-schema`. The fastest
way to understand it is to read the example:

https://github.com/Codevena/cvmake/blob/main/data/cvs/example.en.yaml

`cvmake validate` checks your YAML against the schema and prints
human-readable errors if anything is off.

## Web editor

Prefer a GUI? https://cvmake.codevena.dev — same engine, runs in your
browser. Edit the YAML side-by-side with the live PDF preview, export
when ready.

## License

MIT — see [LICENSE](./LICENSE).
