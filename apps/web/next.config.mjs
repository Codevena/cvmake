/** @type {import('next').NextConfig} */
export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            // TODO: tighten by dropping 'unsafe-inline' from script-src once App
            // Router nonce support is wired cleanly.
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob:",
              "style-src 'self' 'unsafe-inline'",
              // The two Google hosts that used to be allowed here are gone:
              // since the fonts are vendored, nothing in this app fetches
              // either, and an allowance nothing uses is just a wider policy.
              // (`apps/showcase` still loads from Google, but it is a separate
              // static site on GitHub Pages and this header never reaches it.)
              //
              // `data:` is required, not cosmetic: the template fonts are
              // vendored as data: URIs, and the preview renders into an
              // about:blank iframe written with document.write(), which
              // inherits THIS policy rather than the renderer's. Without it the
              // browser refuses every face and the preview silently falls back
              // to a system font — the same PDF/preview mismatch this release
              // set out to remove, only pointing the other way.
              "font-src 'self' data:",
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
