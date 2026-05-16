import { NextResponse } from 'next/server';

/**
 * Liveness probe for Coolify / Docker HEALTHCHECK / external monitors.
 *
 * Deliberately minimal — no I/O, no template bootstrap, no env lookups beyond
 * what's already in process memory.  A 200 here only means the Next.js
 * server is up and accepting requests; it does NOT vouch for downstream
 * dependencies (Puppeteer, filesystem access).  That's the right semantic
 * for a HEALTHCHECK: if this fails, the container is dead; if downstream
 * fails, the user-facing error path handles it.
 *
 * Middleware passes through GET /api/health (matches `/api/:path*` but
 * isn't one of the gated routes).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // Never let a CDN cache a liveness probe.
        'cache-control': 'no-store, max-age=0',
      },
    },
  );
}
