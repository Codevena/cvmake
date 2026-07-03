import { NextResponse } from 'next/server';

/**
 * Checks the Origin header on state-changing requests (CSRF guard).
 * Returns a 403 response if the request should be refused, or undefined if it
 * should proceed.
 *
 * NEXT_PUBLIC_APP_ORIGIN must be set in production (e.g.
 * https://cveditor.codevena.dev). When unset (dev / unconfigured), the
 * check is skipped entirely — the deploy must therefore set the env var to
 * activate CSRF protection.
 *
 * When the env IS set we require Origin to match exactly. Browsers send
 * Origin on every cross-origin POST and same-origin POST per the Fetch spec
 * (since ~Chrome 76 / Firefox 70), so a missing Origin in production means
 * either (a) a non-browser client (curl / server-to-server tooling) — which
 * should not be hitting the demo write APIs anyway, or (b) a stripped-header
 * proxy — which is a misconfiguration the operator owns. Fail-closed in both
 * cases (claude-A pass: previous fail-open let any Origin-less request
 * bypass the CSRF guard).
 */
export function checkOrigin(
  request: Request | { headers: { get(key: string): string | null } },
): NextResponse | undefined {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!allowedOrigin) return undefined; // skip in dev / unset
  const origin = (request as Request).headers.get('origin');
  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ kind: 'forbidden' }, { status: 403 });
  }
  return undefined;
}
