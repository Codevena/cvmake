import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: ['/api/', '/dev-ui', '/cv/'] }],
    sitemap: 'https://editor.cvmake.codevena.dev/sitemap.xml',
  };
}
