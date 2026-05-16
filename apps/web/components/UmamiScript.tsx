import Script from 'next/script';

/**
 * Loads the optional Umami analytics script.
 *
 * Renders nothing unless BOTH env vars are set at build time (NEXT_PUBLIC_*
 * are inlined by Next.js into the client bundle):
 *   - NEXT_PUBLIC_UMAMI_SRC          full URL to the analytics script
 *                                     (default: https://analytics.codevena.dev/script.js)
 *   - NEXT_PUBLIC_UMAMI_WEBSITE_ID   the Umami website UUID for this domain
 *
 * Privacy-first: Umami is cookie-less and GDPR-clean; no IP collection, no
 * cross-site tracking. The script is `defer`ed so it never blocks first paint.
 *
 * CSP impact: `apps/web/next.config.mjs` whitelists `analytics.codevena.dev`
 * for script-src + connect-src.  If you self-host Umami at a different host,
 * update both the env var AND the CSP allowlist together.
 */
export function UmamiScript() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC ?? 'https://analytics.codevena.dev/script.js';
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId) return null;
  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
