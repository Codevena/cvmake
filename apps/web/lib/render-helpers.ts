// `applyHiddenSections` now lives in @codevena/cvmake-core so the PDF export
// route and the CLI build apply it identically before rendering (previously it
// ran only in the web preview, so hidden sections still printed in the export).
// Re-exported here from the dedicated, Node-free subpath so this module stays
// safe to import from the client `PreviewFrame`.
export { applyHiddenSections } from '@codevena/cvmake-core/hidden-sections';
