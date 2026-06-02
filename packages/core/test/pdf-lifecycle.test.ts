import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Puppeteer so we exercise the browser-lifecycle logic without launching
// real Chromium. `vi.hoisted` lets the (hoisted) vi.mock factory share the spy.
const { launch } = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock('puppeteer', () => ({ default: { launch } }));

const HTML = '<!doctype html><html><body><h1>x</h1></body></html>';

interface FakeBrowser {
  on: (ev: string, cb: () => void) => void;
  newPage: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  emit: (ev: string) => void;
}

let browsers: FakeBrowser[] = [];

function makePage() {
  return {
    emulateMediaType: vi.fn(async () => {}),
    setContent: vi.fn(async () => {}),
    evaluate: vi.fn(async () => undefined),
    // minimal valid "%PDF-" header so Buffer.from(...) succeeds
    pdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
    close: vi.fn(async () => {}),
  };
}

function makeBrowser(): FakeBrowser {
  const handlers: Record<string, (() => void) | undefined> = {};
  const browser: FakeBrowser = {
    on: (ev, cb) => {
      handlers[ev] = cb;
    },
    newPage: vi.fn(async () => makePage()),
    // Real Chromium emits "disconnected" when it closes — model that.
    close: vi.fn(async () => {
      handlers.disconnected?.();
    }),
    emit: (ev) => handlers[ev]?.(),
  };
  browsers.push(browser);
  return browser;
}

beforeEach(() => {
  // Fresh module state (browserPromise / renderCount / inFlight) per test.
  vi.resetModules();
  browsers = [];
  launch.mockReset();
  launch.mockImplementation(async () => makeBrowser());
  // Empty string → Number('') === 0 → maxRenders() falls back to its default.
  process.env.CVMAKE_PDF_MAX_RENDERS = '';
});

describe('pdf browser lifecycle', () => {
  it('reuses a single browser across renders', async () => {
    const { generatePDF } = await import('../src/pdf.js');
    await generatePDF(HTML);
    await generatePDF(HTML);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(browsers).toHaveLength(1);
  });

  it('relaunches after the browser disconnects (crash recovery)', async () => {
    const { generatePDF } = await import('../src/pdf.js');
    await generatePDF(HTML);
    expect(launch).toHaveBeenCalledTimes(1);
    // Simulate an unexpected crash of the live browser.
    browsers[0]?.emit('disconnected');
    await generatePDF(HTML);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('recycles the browser after CVMAKE_PDF_MAX_RENDERS renders', async () => {
    process.env.CVMAKE_PDF_MAX_RENDERS = '3';
    const { generatePDF } = await import('../src/pdf.js');
    await generatePDF(HTML);
    await generatePDF(HTML);
    await generatePDF(HTML);
    expect(launch).toHaveBeenCalledTimes(1); // still on the first browser
    await generatePDF(HTML); // 4th render: count hit, nothing in flight → recycle
    expect(launch).toHaveBeenCalledTimes(2);
    expect(browsers[0]?.close).toHaveBeenCalled();
  });

  it('shutdownPdfBrowser closes and resets so the next render relaunches', async () => {
    const { generatePDF, shutdownPdfBrowser } = await import('../src/pdf.js');
    await generatePDF(HTML);
    await shutdownPdfBrowser();
    expect(browsers[0]?.close).toHaveBeenCalled();
    await generatePDF(HTML);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it('keeps recycling working after a crash during an in-flight render', async () => {
    // Regression: a disconnect while a render is in flight must not drive
    // `inFlight` negative and wedge the recycle gate forever.
    process.env.CVMAKE_PDF_MAX_RENDERS = '1';
    let releasePdf: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releasePdf = resolve;
    });
    let pdfReached = false;

    // First browser's page parks inside pdf() until we release the gate.
    launch.mockImplementationOnce(async () => {
      const b = makeBrowser();
      b.newPage = vi.fn(async () => {
        const page = makePage();
        page.pdf = vi.fn(async () => {
          pdfReached = true;
          await gate;
          return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
        });
        return page;
      });
      return b;
    });

    const { generatePDF } = await import('../src/pdf.js');
    const inFlight = generatePDF(HTML); // parks at pdf()
    // Let the (all-immediate) async steps drain until the render is at pdf().
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(pdfReached).toBe(true);

    // Crash the browser while the render is still in flight, then let it finish.
    browsers[0]?.emit('disconnected');
    releasePdf();
    await inFlight;
    expect(launch).toHaveBeenCalledTimes(1);

    // Recycling must still trigger: relaunch (browser was reset by disconnect)
    // then recycle after maxRenders=1. If inFlight were stuck negative, the
    // recycle gate would never match and launch would stay at 2.
    await generatePDF(HTML);
    await generatePDF(HTML);
    expect(launch.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('prewarmPdfBrowser launches ahead of the first render', async () => {
    const { prewarmPdfBrowser, generatePDF } = await import('../src/pdf.js');
    await prewarmPdfBrowser();
    expect(launch).toHaveBeenCalledTimes(1);
    await generatePDF(HTML); // reuses the prewarmed browser
    expect(launch).toHaveBeenCalledTimes(1);
  });
});
