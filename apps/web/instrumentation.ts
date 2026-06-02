// Next.js instrumentation hook — runs once when the server process boots.
//
// Opt-in PDF browser pre-warm: set CVMAKE_PDF_PREWARM=1 to launch Chromium at
// boot so the first /api/export doesn't pay the cold-start cost. Off by default
// because a warm Chromium holds ~150 MB idle; enable it on always-on hosts
// where first-export latency matters more than idle memory. Node.js runtime
// only (Puppeteer can't run on the Edge runtime).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.CVMAKE_PDF_PREWARM !== '1') return;
  const { prewarmPdfBrowser } = await import('@codevena/cvmake-core/pdf');
  await prewarmPdfBrowser();
}
