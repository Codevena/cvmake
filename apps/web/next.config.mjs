/** @type {import('next').NextConfig} */
export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // TODO: tighten after next/font migration completes (style-src and font-src
            // can drop the googleapis.com / gstatic.com allowance once next/font
            // self-hosts the fonts). The allowance is harmless post-migration.
            // Also tighten script-src by dropping 'unsafe-inline' once App Router
            // nonce support is wired cleanly.
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // analytics.codevena.dev = self-hosted Umami (apps/web/components/UmamiScript.tsx).
              // If you point NEXT_PUBLIC_UMAMI_SRC at a different host, update
              // both script-src AND connect-src below to match.
              "script-src 'self' 'unsafe-inline' https://analytics.codevena.dev",
              "connect-src 'self' https://analytics.codevena.dev",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
