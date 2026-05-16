/**
 * Tiny privacy-respecting analytics shim around the optional Umami script
 * (loaded by `apps/web/components/UmamiScript.tsx` when both
 * NEXT_PUBLIC_UMAMI_SRC and NEXT_PUBLIC_UMAMI_WEBSITE_ID are set).
 *
 * `track()` is a no-op when the script is absent (dev, self-hosted without
 * analytics, or before the script has loaded on first paint). Never throws
 * — analytics is non-essential telemetry, never let it break user actions.
 *
 * Event names follow the audit's C14 plan:
 *   - editor.template_change    (which template did they pick)
 *   - editor.palette_change     (which palette)
 *   - editor.export_pdf         (the conversion event)
 *   - editor.download_yaml      ("I'm taking this seriously")
 *   - editor.locale_switch      (proves the bilingual demo works)
 */

declare global {
  interface Window {
    umami?: {
      track: (event: string, props?: Record<string, unknown>) => void;
    };
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    window.umami?.track(event, props);
  } catch {
    // Never let analytics break a user action.
  }
}
