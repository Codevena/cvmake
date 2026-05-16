'use client';
import { useState } from 'react';

/**
 * C9 (audit) — quick-fix for the editor's broken responsive layout.
 *
 * The 3-pane editor shell has no `md:`/`lg:` Tailwind classes anywhere; below
 * ~1024 px the form column collapses to a sliver, the tab strip overflows,
 * and the preview iframe spills horizontally inside its parent. Until the
 * full mobile redesign lands (Phase 4 / v0.2), show a friendly overlay
 * instead of the broken UI and surface the CLI as the supported small-screen
 * path. Power users who insist can click "Continue anyway" to dismiss the
 * overlay for the current tab.
 *
 * Pure-CSS visibility via the lg: breakpoint avoids a hydration flash —
 * JS is only needed for the override toggle.
 */
export function MobileGuard({ children }: { children: React.ReactNode }) {
  const [overridden, setOverridden] = useState(false);

  // Override path: render the editor regardless of viewport. Power-user escape
  // hatch — note: the editor UI is genuinely broken below lg, by design only
  // power users who know what they're doing will click through.
  if (overridden) return <>{children}</>;

  return (
    <>
      {/* Editor — visible only at lg (≥1024 px). */}
      <div className="hidden lg:block">{children}</div>

      {/* Mobile/tablet overlay — visible below lg. */}
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text lg:hidden">
        <h1 className="font-display text-3xl">Desktop required</h1>
        <p className="max-w-sm text-sm text-text-muted">
          The cvmake editor is built for screens 1024 px wide and above. The mobile layout is on the
          roadmap (v0.2) — for now please use the CLI, or open this page on a larger screen.
        </p>
        <div className="mt-2 flex flex-col items-stretch gap-2 text-sm">
          <a
            href="https://cvmake.codevena.dev"
            className="rounded-md bg-accent px-4 py-2 font-medium text-on-accent transition hover:opacity-90"
          >
            Back to homepage
          </a>
          <a
            href="https://www.npmjs.com/package/@codevena/cvmake-cli"
            className="rounded-md border border-border bg-surface px-4 py-2 text-text-muted transition hover:bg-elevated"
          >
            Get the CLI →
          </a>
          <button
            type="button"
            onClick={() => setOverridden(true)}
            className="mt-2 text-xs text-text-muted underline-offset-2 hover:underline"
          >
            Continue anyway (UI will be cramped)
          </button>
        </div>
      </div>
    </>
  );
}
