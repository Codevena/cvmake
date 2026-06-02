import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';

let browserPromise: Promise<Browser> | null = null;
// Renders served by the current browser, and renders currently in flight on it.
// `renderCount` drives recycling (bound memory growth); `inFlight` makes
// recycling safe — we only ever close a browser when nothing is rendering on it.
let renderCount = 0;
let inFlight = 0;

/**
 * How many renders a single browser serves before it is recycled. Long-lived
 * Chromium processes accumulate memory, so we restart after N renders. Override
 * with CVMAKE_PDF_MAX_RENDERS (e.g. tune down on a memory-constrained host).
 */
function maxRenders(): number {
  const v = Number(process.env.CVMAKE_PDF_MAX_RENDERS);
  return Number.isFinite(v) && v > 0 ? v : 100;
}

async function getBrowser(): Promise<Browser> {
  // Recycle the browser once it has served enough renders AND nothing is
  // rendering on it right now. Gating on `inFlight === 0` guarantees we never
  // close a browser out from under an in-flight render (which would surface as
  // a spurious "Target closed"); under load the recycle simply happens at the
  // next idle gap.
  if (browserPromise && renderCount >= maxRenders() && inFlight === 0) {
    const old = browserPromise;
    browserPromise = null;
    renderCount = 0;
    try {
      await (await old).close();
    } catch {
      /* already gone */
    }
  }
  if (!browserPromise) {
    // Cache the launch promise so concurrent callers share one browser.
    // Critically: if the launch fails (e.g. transient Chromium crash, OOM
    // during sandbox init), reset the cache so the NEXT call retries — the
    // alternative (leaving a permanently-rejected promise here) would brick
    // every subsequent PDF export until the Node process restarts.
    const p = (async () => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
      });
      // If the browser dies unexpectedly (crash / OOM / external kill) after a
      // successful launch, drop the cache so the next render relaunches instead
      // of reusing a dead browser. Without this a single Chromium crash bricks
      // every subsequent export. Intentional close (recycle/shutdown) also
      // fires this, but by then `browserPromise` no longer === p, so it no-ops.
      browser.on('disconnected', () => {
        if (browserPromise === p) {
          browserPromise = null;
          renderCount = 0;
          // NB: do NOT reset `inFlight` here. Renders that were in flight on the
          // crashed browser will still run their `finally` and decrement it
          // themselves; zeroing it here would make those decrements drive
          // `inFlight` negative, permanently wedging the `inFlight === 0`
          // recycle gate.
        }
      });
      return browser;
    })();
    browserPromise = p;
    p.catch(() => {
      if (browserPromise === p) browserPromise = null;
    });
  }
  return browserPromise;
}

/**
 * Best-effort pre-warm: launch the shared browser ahead of the first request so
 * the initial export doesn't pay the cold-start cost. Safe to call at server
 * boot; swallows launch errors (the next render will retry via getBrowser).
 */
export async function prewarmPdfBrowser(): Promise<void> {
  try {
    await getBrowser();
  } catch {
    /* best-effort — getBrowser already reset the cache for a retry */
  }
}

export async function shutdownPdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  renderCount = 0;
  inFlight = 0;
  await b.close();
}

export interface GeneratePDFOptions {
  format?: 'A4' | 'Letter' | undefined;
  margin?: { top: string; right: string; bottom: string; left: string } | undefined;
  /**
   * Ceiling on how long to wait for `document.fonts.ready` before rendering.
   * With `waitUntil: 'load'` (puppeteer 24+), `setContent` returns before web
   * fonts are guaranteed to have loaded — a generous default gives templates
   * that @import Google Fonts enough time to fetch and decode font files
   * before the PDF is rasterized.
   */
  fontTimeoutMs?: number | undefined;
  /**
   * Optional cancellation. When aborted (e.g. the caller hit a render-timeout
   * budget), the underlying Puppeteer page is closed which surfaces a
   * "Target closed" rejection from the in-flight `page.pdf()` / `page.evaluate`.
   * The semaphore in the caller can therefore release synchronously with the
   * generatePDF promise settling.
   */
  signal?: AbortSignal | undefined;
}

export async function generatePDF(html: string, opts: GeneratePDFOptions = {}): Promise<Buffer> {
  // Wire abort handling BEFORE any async work so a timeout that fires while
  // the browser is still launching or the page is being created is observed
  // (and so the abort handler closes whatever page exists at that moment).
  let page: Page | null = null;
  let counted = false;
  const onAbort = () => {
    page?.close().catch(() => {
      /* page may already be closed by the finally */
    });
  };
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    if (opts.signal?.aborted) {
      throw new Error('aborted before start');
    }
    const browser = await getBrowser();
    // Account this render against the current browser (drives recycling) and
    // mark it in-flight so a recycle can't close the browser under us.
    inFlight += 1;
    renderCount += 1;
    counted = true;
    if (opts.signal?.aborted) {
      throw new Error('aborted during browser launch');
    }
    page = await browser.newPage();
    if (opts.signal?.aborted) {
      throw new Error('aborted during page creation');
    }
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'load' });
    // Wait for fonts to be ready, with a generous ceiling.  Clear the timer
    // when fonts resolve early so the export load doesn't accumulate stale
    // setTimeout handles under high RPS.
    let fontTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        page
          .evaluate(() => (document as unknown as { fonts: { ready: Promise<void> } }).fonts.ready)
          .finally(() => {
            if (fontTimer !== undefined) clearTimeout(fontTimer);
          }),
        new Promise<void>((resolve) => {
          fontTimer = setTimeout(resolve, opts.fontTimeoutMs ?? 10_000);
        }),
      ]);
    } finally {
      if (fontTimer !== undefined) clearTimeout(fontTimer);
    }

    // Inject ~16pt top breathing-space onto every page after page 1.
    // We measure where natural page breaks fall in the printed flow and insert
    // spacer divs in the main content column right before the element that
    // would otherwise sit flush against the top of a new page. Puppeteer keeps
    // margin: 0 here so the full-bleed sidebar gradient is preserved; the
    // CSS @page margins (top/bottom) live in shared/print.css.
    await page.evaluate(() => {
      // A4 portrait at 96 DPI: 794 × 1123 CSS px.
      // shared/print.css declares @page { margin: 28mm 0 18mm 0 } → with
      // preferCSSPageSize:true Chromium honors those margins, so the printable
      // content height per page is A4Height - topMargin - bottomMargin.
      const MM_TO_PX = 96 / 25.4;
      const A4_HEIGHT_PX = 297 * MM_TO_PX; // ≈ 1122.52
      const PAGE_TOP_MARGIN_PX = 28 * MM_TO_PX; // ≈ 105.83
      const PAGE_BOTTOM_MARGIN_PX = 18 * MM_TO_PX; // ≈ 68.03
      const CONTENT_HEIGHT_PX = A4_HEIGHT_PX - PAGE_TOP_MARGIN_PX - PAGE_BOTTOM_MARGIN_PX;
      const SPACER_PT = 16;
      const MAX_PAGES = 12; // safety cap

      // Find the deepest container(s) that hold paginating content. We
      // operate on `<main>` of each known sidebar template if present, else
      // walk down through single-child wrappers (article > __page) until we
      // reach the level with multiple structural children. For grid-based
      // dual-column templates (sidebar + main) we additionally treat the
      // `<aside>` as its own paginating track, because Chromium paginates
      // each grid track independently and a spacer in `<main>` does NOT
      // push down sidebar content that overflows onto page 2.
      const bodyTop = document.body.getBoundingClientRect().top;
      const yTop = (el: Element): number => el.getBoundingClientRect().top - bodyTop;
      const yBottom = (el: Element): number => el.getBoundingClientRect().bottom - bodyTop;

      const findContainers = (): HTMLElement[] => {
        const mainTag = document.querySelector('main');
        if (mainTag instanceof HTMLElement) {
          const containers: HTMLElement[] = [mainTag];
          // If the page wrapper is a CSS grid/flex with a sibling <aside>,
          // treat the aside as a second paginating track.
          const asideTag = document.querySelector('aside');
          if (asideTag instanceof HTMLElement) containers.push(asideTag);
          return containers;
        }
        // Walk down: body -> article -> __page -> ...
        let cur: HTMLElement = document.body;
        for (let depth = 0; depth < 4; depth++) {
          const kids = Array.from(cur.children).filter(
            (c): c is HTMLElement => c instanceof HTMLElement,
          );
          if (kids.length === 1 && kids[0]) {
            cur = kids[0];
          } else {
            break;
          }
        }
        return [cur];
      };

      const isAvoidBreak = (el: HTMLElement): boolean => {
        const cs = getComputedStyle(el);
        return (
          cs.breakInside === 'avoid' ||
          cs.breakInside === 'avoid-page' ||
          // Older alias still reported by some browsers via getComputedStyle
          (cs as unknown as { pageBreakInside?: string }).pageBreakInside === 'avoid'
        );
      };

      const injectSpacersIn = (rootEl: HTMLElement): void => {
        // Collect candidate break-point elements. Direct children of rootEl
        // plus grandchildren of any tall (>0.6 page) wrapper, plus a one-step
        // descent through tall single-child wrappers so we always reach the
        // structural children regardless of layout.
        const candidates: HTMLElement[] = [];
        const pushChildren = (el: HTMLElement, depth = 0): void => {
          const kids = Array.from(el.children).filter(
            (c): c is HTMLElement => c instanceof HTMLElement,
          );
          for (const kid of kids) {
            const h = kid.getBoundingClientRect().height;
            const grand = Array.from(kid.children).filter(
              (c): c is HTMLElement => c instanceof HTMLElement,
            );
            if (h > CONTENT_HEIGHT_PX * 0.6 && grand.length > 1 && depth < 2) {
              // Tall wrapper — descend one level so we have finer break points.
              for (const gc of grand) candidates.push(gc);
            } else if (h > CONTENT_HEIGHT_PX * 0.6 && grand.length === 1 && depth < 2) {
              // Tall single-child wrapper — descend through it transparently.
              pushChildren(kid, depth + 1);
            } else {
              candidates.push(kid);
            }
          }
        };
        pushChildren(rootEl);

        // Iteratively detect page-break elements and inject spacers. After
        // each injection, downstream y-coordinates change, so we re-scan
        // with the updated layout. We track per-page injection so we add at
        // most one spacer per page break (per container).
        //
        // Detection: an element starts a new page if either
        //   (a) its flow `top` lies past a page boundary (natural break), or
        //   (b) the element straddles a boundary in flow but has computed
        //       `break-inside: avoid`, in which case the browser pushes it
        //       entirely to the next page.
        const handledPages = new Set<number>([1]);
        let i = 0;
        let safety = 0;
        while (i < candidates.length && safety++ < 200) {
          const el = candidates[i] as HTMLElement;
          const top = yTop(el);
          const bot = yBottom(el);
          const pageOfTop = Math.floor(top / CONTENT_HEIGHT_PX) + 1;
          const pageOfBot = Math.floor((bot - 0.5) / CONTENT_HEIGHT_PX) + 1;

          let starterPage = 0;
          if (pageOfTop > 1) {
            // Natural page break before this element.
            starterPage = pageOfTop;
          } else if (pageOfBot > pageOfTop && isAvoidBreak(el)) {
            // Straddles a boundary but is unbreakable → moved entirely to
            // the next page by the print engine.
            starterPage = pageOfBot;
          }

          if (starterPage > 0 && !handledPages.has(starterPage)) {
            const spacer = document.createElement('div');
            spacer.className = 'cv-page-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            spacer.style.height = `${SPACER_PT}pt`;
            spacer.style.width = '100%';
            spacer.style.flexShrink = '0';
            // Prevent the spacer from being collapsed or broken across
            // pages, and force it to live at the start of the new page so
            // the browser doesn't squeeze it onto the previous one.
            spacer.style.breakInside = 'avoid';
            spacer.style.pageBreakInside = 'avoid';
            spacer.style.breakBefore = 'page';
            spacer.style.pageBreakBefore = 'always';
            el.parentNode?.insertBefore(spacer, el);
            handledPages.add(starterPage);
            if (handledPages.size > MAX_PAGES) break;
            // Re-evaluate the same element with updated layout.
            continue;
          }
          i++;
        }
      };

      for (const container of findContainers()) injectSpacersIn(container);
    });

    const pdf = await page.pdf({
      format: opts.format ?? 'A4',
      printBackground: true,
      margin: opts.margin ?? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    opts.signal?.removeEventListener('abort', onAbort);
    await page?.close().catch(() => {
      /* may already be closed by onAbort, or never created if abort was early */
    });
    // Clamp defensively: never let `inFlight` go negative (which would wedge
    // the recycle gate) even if the browser disconnected mid-render.
    if (counted) inFlight = Math.max(0, inFlight - 1);
  }
}
