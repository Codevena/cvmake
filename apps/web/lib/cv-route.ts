// Where the editor lives for a given CV.
//
// In demo mode the editor is served at `/` and the `/cv/<slug>` route
// redirects away, so switching CVs is a `?slug=` query param. In normal
// (local) use it is the `/cv/<slug>` route. Both the TopBar CV selector
// and the ⌘K palette's "switch CV" command route through here so the two
// stay consistent.
export function cvRoute(slug: string, demo: boolean): string {
  return demo ? `/?slug=${encodeURIComponent(slug)}` : `/cv/${encodeURIComponent(slug)}`;
}
