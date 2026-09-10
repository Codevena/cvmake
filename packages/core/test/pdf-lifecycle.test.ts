import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    // generatePDF installs the render network policy before touching the
    // document; a fake page without these two would make every lifecycle test
    // fail on a TypeError. Deliberately fake, not tolerated in the source:
    // making the installation optional there would remove its fail-closed
    // behaviour.
    setRequestInterception: vi.fn(async () => {}),
    on: vi.fn(),
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

afterEach(async () => {
  // `launch` is one spy shared by every test, while `vi.resetModules()` hands
  // each test a fresh copy of pdf.ts. A recycle still finishing when a test
  // returns therefore calls `launch` again AFTER the next test has reset the
  // count — and that test then sees two launches where it expects one. Which
  // test it lands in depends on machine load, which is what made this suite
  // flaky rather than wrong.
  //
  // Shutting the module's browser down and draining the queue keeps each
  // test's async work inside its own boundary.
  const { shutdownPdfBrowser } = await import('../src/pdf.js');
  await shutdownPdfBrowser();
  await new Promise((resolve) => setImmediate(resolve));
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
    // Wait for the CONDITION, not for a duration. A fixed 50 ms was a guess
    // about how fast this machine drains a promise chain, and on a loaded one
    // it is not enough: the assertion below then reads `false` and the test
    // fails for a reason that has nothing to do with the code under test.
    await vi.waitFor(() => expect(pdfReached).toBe(true), { timeout: 5000, interval: 5 });

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

  it('returns even when Chromium refuses to exit', async () => {
    // `browser.close()` waits for the process to leave. On a loaded machine
    // that outlasted a 30 s hook timeout while all 182 tests of the web suite
    // passed — the teardown was the failure, not the tests. A shutdown that
    // never returns hangs whatever waits on it: a test teardown here, a
    // process trying to exit in production.
    //
    // Modelled as a close() that never settles, which is what "wedged" looks
    // like from the outside.
    const killed: string[] = [];
    launch.mockImplementationOnce(async () => {
      const b = makeBrowser() as FakeBrowser & { process?: () => unknown };
      b.close = vi.fn(() => new Promise<void>(() => {}));
      b.process = () => ({
        exitCode: null,
        signalCode: null,
        kill: (sig: string) => killed.push(sig),
      });
      return b;
    });

    const { generatePDF, shutdownPdfBrowser } = await import('../src/pdf.js');
    await generatePDF(HTML);

    const started = Date.now();
    await shutdownPdfBrowser();
    const elapsed = Date.now() - started;

    // Bounded, not indefinite. The grace period is 5 s; anything near a hook
    // timeout means the bound is gone.
    expect(elapsed).toBeLessThan(15_000);
    // And the process is actually stopped rather than merely abandoned.
    expect(killed).toEqual(['SIGKILL']);
  }, 30_000);

  it('does not kill a browser that closed cleanly', async () => {
    // The counter-probe. Without it, a shutdown that always sends SIGKILL —
    // losing the graceful path entirely — would pass the case above.
    const killed: string[] = [];
    launch.mockImplementationOnce(async () => {
      let exited = false;
      const b = makeBrowser() as FakeBrowser & { process?: () => unknown };
      const origClose = b.close;
      b.close = vi.fn(async () => {
        await origClose();
        exited = true;
      });
      // A getter, not a snapshot: the real ChildProcess is a live object whose
      // `exitCode` flips when it dies, and the code under test reads it AFTER
      // awaiting the close. A fake that froze the value at capture time would
      // report "still running" for ever and make this counter-probe fail
      // against correct code — which is exactly what it did on the first run.
      b.process = () => ({
        get exitCode() {
          return exited ? 0 : null;
        },
        signalCode: null,
        kill: (sig: string) => killed.push(sig),
      });
      return b;
    });

    const { generatePDF, shutdownPdfBrowser } = await import('../src/pdf.js');
    await generatePDF(HTML);
    await shutdownPdfBrowser();
    expect(killed).toEqual([]);
  });

  it('prewarmPdfBrowser launches ahead of the first render', async () => {
    const { prewarmPdfBrowser, generatePDF } = await import('../src/pdf.js');
    await prewarmPdfBrowser();
    expect(launch).toHaveBeenCalledTimes(1);
    await generatePDF(HTML); // reuses the prewarmed browser
    expect(launch).toHaveBeenCalledTimes(1);
  });
});
