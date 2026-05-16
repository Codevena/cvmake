import { UmamiScript } from '@/components/UmamiScript';
import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://editor.cvmake.codevena.dev'),
  title: { default: 'cvmake — CV editor', template: '%s | cvmake' },
  description:
    'Open-source CV builder. Edit your YAML CV in the browser and export a polished PDF in seconds.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'cvmake — CV editor',
    description: 'Open-source CV builder. YAML in, PDF out.',
    url: 'https://editor.cvmake.codevena.dev',
    siteName: 'cvmake',
    type: 'website',
    images: [
      {
        url: 'https://cvmake.codevena.dev/og-card.png',
        width: 1200,
        height: 630,
        alt: 'cvmake — CV builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'cvmake — CV editor',
    description: 'Open-source CV builder. YAML in, PDF out.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0f17',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg text-text font-sans antialiased">
        {children}
        <UmamiScript />
      </body>
    </html>
  );
}
