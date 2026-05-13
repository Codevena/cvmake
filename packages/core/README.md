# @codevena/cvmake-core

Core engine for [cvmake](https://github.com/Codevena/cvmake): YAML
loader, React renderer, Puppeteer-driven PDF generator, photo embedder,
i18n helpers.

Most users should depend on `@codevena/cvmake-cli` directly, not this
package.

## Entry points

This package exports several subpaths:

- `@codevena/cvmake-core` — main exports
- `@codevena/cvmake-core/errors`
- `@codevena/cvmake-core/html-document`
- `@codevena/cvmake-core/loader`
- `@codevena/cvmake-core/renderer`
- `@codevena/cvmake-core/renderer-types`
- `@codevena/cvmake-core/photo`
- `@codevena/cvmake-core/photo-embed`
- `@codevena/cvmake-core/pdf`
- `@codevena/cvmake-core/i18n`

## Heavy dependencies

This package depends on `puppeteer` (downloads ~150 MB Chromium on
install) and `sharp` (native image processing). These are required for
high-fidelity PDF rendering.

## License

MIT — see [LICENSE](./LICENSE).
