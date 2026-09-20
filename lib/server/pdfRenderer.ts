// Server-only. Deliberately uses no "@/" aliases so it can also be exercised by a
// plain node script (scripts/pdf-smoke.ts) without the Next bundler.
import { chromium, type Browser, type BrowserContext } from "playwright";

/**
 * Renders one of OUR OWN pages to a PDF with headless Chromium (Playwright).
 * The page is the same React template the user sees (InvoiceDocument), so the
 * PDF and the UI never drift apart.
 *
 * Operational design:
 *  - ONE shared Chromium process, launched lazily and relaunched if it dies.
 *    A fresh browser per request costs ~1s and hundreds of MB.
 *  - Each render gets its own isolated BrowserContext (no shared cookies/cache),
 *    always closed in `finally`.
 *  - At most PDF_MAX_CONCURRENCY renders at once; the rest queue for up to
 *    PDF_QUEUE_TIMEOUT_MS, then get PdfBusyError (→ 503 + Retry-After). Memory
 *    is bounded: ~300–600MB per concurrent page.
 *  - The browser is recycled after PDF_RECYCLE_AFTER renders (when idle) to cap
 *    slow leaks in a long-lived process.
 *  - The page may only load same-origin/data:/blob: resources, so a stored value
 *    can never make the headless browser fetch an arbitrary URL.
 */

const MAX_CONCURRENCY = Math.max(1, Number(process.env.PDF_MAX_CONCURRENCY) || 2);
const QUEUE_TIMEOUT_MS = Number(process.env.PDF_QUEUE_TIMEOUT_MS) || 20_000;
const RENDER_TIMEOUT_MS = Number(process.env.PDF_RENDER_TIMEOUT_MS) || 30_000;
const RECYCLE_AFTER = Math.max(1, Number(process.env.PDF_RECYCLE_AFTER) || 200);

export class PdfBusyError extends Error {
  constructor() {
    super("PDF generation is busy, try again shortly");
    this.name = "PdfBusyError";
  }
}

export class PdfEngineError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PdfEngineError";
  }
}

// ── browser lifecycle ────────────────────────────────────────────────────────

let browserPromise: Promise<Browser> | null = null;
let rendersSinceLaunch = 0;

const LAUNCH_ARGS = ["--disable-dev-shm-usage", "--disable-gpu", "--font-render-hinting=none"];

/**
 * Launch order: an explicit PDF_CHROMIUM_EXECUTABLE / PDF_CHROMIUM_CHANNEL wins; otherwise
 * Playwright's own Chromium, then (dev machines where it isn't installed) the system Chrome
 * or Edge. In production the Docker image ships Playwright's Chromium, so the fallbacks
 * never run there.
 */
async function launchChromium(): Promise<Browser> {
  const explicitPath = process.env.PDF_CHROMIUM_EXECUTABLE || undefined;
  const explicitChannel = process.env.PDF_CHROMIUM_CHANNEL || undefined;
  const attempts: Array<{ executablePath?: string; channel?: string }> = [{ executablePath: explicitPath, channel: explicitChannel }];
  if (!explicitPath && !explicitChannel) attempts.push({ channel: "chrome" }, { channel: "msedge" });

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await chromium.launch({ headless: true, ...attempt, args: LAUNCH_ARGS });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function getBrowser(): Promise<Browser> {
  if (browserPromise) return browserPromise;
  const launched: Promise<Browser> = launchChromium()
    .then((browser) => {
      browser.on("disconnected", () => {
        if (browserPromise === launched) browserPromise = null;
      });
      return browser;
    })
    .catch((err: unknown) => {
      if (browserPromise === launched) browserPromise = null;
      throw new PdfEngineError(
        "PDF engine unavailable (Chromium could not be launched). " +
          "Run `npx playwright install --with-deps chromium`, install Chrome/Edge, or set PDF_CHROMIUM_EXECUTABLE.",
        { cause: err },
      );
    });
  browserPromise = launched;
  rendersSinceLaunch = 0;
  return launched;
}

async function recycleIfDue() {
  if (active > 0 || waiters.length > 0 || rendersSinceLaunch < RECYCLE_AFTER || !browserPromise) return;
  const current = browserPromise;
  browserPromise = null;
  try {
    await (await current).close();
  } catch {
    /* already gone */
  }
}

// ── concurrency gate ─────────────────────────────────────────────────────────

let active = 0;
const waiters: { resolve: () => void; timer: ReturnType<typeof setTimeout> }[] = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const waiter = {
      resolve,
      timer: setTimeout(() => {
        const i = waiters.indexOf(waiter);
        if (i >= 0) waiters.splice(i, 1);
        reject(new PdfBusyError());
      }, QUEUE_TIMEOUT_MS),
    };
    waiters.push(waiter);
  });
}

function release() {
  const next = waiters.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(); // the slot is handed over, `active` stays the same
  } else {
    active--;
  }
}

// ── render ───────────────────────────────────────────────────────────────────

export interface RenderPdfOptions {
  /** Absolute URL of the page to print (must be our own origin). */
  url: string;
  /** Exposed to the page as `window.__PDF_DATA__` before any script runs. */
  initData?: unknown;
  /** Left side of the footer, e.g. the invoice number. */
  footerLabel?: string;
  /** Attribute the page sets when it has finished rendering. */
  readySelector?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function renderPdf(opts: RenderPdfOptions): Promise<Buffer> {
  await acquire();
  let context: BrowserContext | undefined;
  try {
    const browser = await getBrowser();
    const origin = new URL(opts.url).origin;

    context = await browser.newContext({
      viewport: { width: 794, height: 1123 }, // A4 @ 96dpi
      locale: "id-ID",
      timezoneId: "Asia/Jakarta",
    });
    if (opts.initData !== undefined) {
      await context.addInitScript((data) => {
        (window as unknown as { __PDF_DATA__: unknown }).__PDF_DATA__ = data;
      }, opts.initData);
    }
    await context.route("**/*", (route) => {
      const u = route.request().url();
      if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith(origin)) return route.continue();
      return route.abort();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);
    // A template crash otherwise just looks like "never became ready".
    page.on("pageerror", (e) => console.error("[pdf] page error:", e.message));
    await page.goto(opts.url, { waitUntil: "load" });
    await page.waitForSelector(opts.readySelector ?? '[data-pdf-ready="true"]', { state: "attached" });
    await page.emulateMedia({ media: "print" });

    const label = opts.footerLabel ? escapeHtml(opts.footerLabel) : "";
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      // Size and margins come from the page's own @page rules (see InvoicePdfClient):
      // Chromium only paints inside the page box, so margins must be CSS-side for a
      // template to have full-bleed areas.
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        `<div style="width:100%;padding:0 12mm;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#94a3b8;` +
        `display:flex;justify-content:space-between;">` +
        `<span>${label}</span>` +
        `<span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
    return Buffer.from(pdf);
  } finally {
    await context?.close().catch(() => undefined);
    rendersSinceLaunch++;
    release();
    void recycleIfDue();
  }
}

/** For tests / graceful shutdown. */
export async function closePdfBrowser() {
  const current = browserPromise;
  browserPromise = null;
  if (current) await (await current).close().catch(() => undefined);
}
