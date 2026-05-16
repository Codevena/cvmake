import { type NextRequest, NextResponse } from 'next/server';

const DEMO_SLUGS = new Set(['example.en', 'example.de']);

/**
 * Demo-mode API gate (C1).
 *
 * When NEXT_PUBLIC_DEMO_MODE=true:
 * - Refuse all non-GET requests to mutating API routes (save, upload, export, cv).
 *   Exception: POST /api/export is allowed but slug-checked in the route handler.
 * - For GET /api/cv/[slug] restrict to DEMO_SLUGS only.
 *
 * Non-demo builds: middleware is a no-op pass-through.
 */
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return NextResponse.next();
  }

  const { pathname, method } = { pathname: request.nextUrl.pathname, method: request.method };

  // Allow GET /api/cv (listing — filtered in route handler)
  // Allow GET /api/cv/[slug] for demo slugs only
  // Block all other non-GET methods on state-changing routes
  // Exception: allow POST /api/export (PDF export is the headline feature, slug-checked in handler)

  const isExport = pathname === '/api/export';
  const isCvListing = pathname === '/api/cv';
  const isCvSlug = pathname.startsWith('/api/cv/');
  const isSave = pathname === '/api/save';
  const isUpload = pathname === '/api/upload';

  // Allow POST /api/export through — slug will be validated in the handler
  if (isExport && method === 'POST') {
    return NextResponse.next();
  }

  // Block all non-GET state-changing routes in demo mode
  if ((isSave || isUpload || isExport || isCvListing || isCvSlug) && method !== 'GET') {
    return NextResponse.json({ kind: 'forbidden' }, { status: 403 });
  }

  // For GET /api/cv/[slug], restrict to demo slugs
  if (isCvSlug && method === 'GET') {
    const slug = pathname.slice('/api/cv/'.length);
    if (!DEMO_SLUGS.has(slug)) {
      return NextResponse.json({ kind: 'not_found' }, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
