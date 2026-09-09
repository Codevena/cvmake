import type { Page } from 'puppeteer';

/**
 * Network policy for the PDF renderer.
 *
 * The PDF is rendered from an HTML string that carries user-supplied CV data.
 * Without a policy, Chromium resolves every subresource in that document —
 * which turns a public export endpoint into a server-side request forge: a
 * `personal.photo` of `http://169.254.169.254/…` makes the render host fetch
 * it. This module is the authoritative control against that.
 */
export interface RenderNetworkPolicy {
  /** Exact hostnames reachable over https. Empty = no remote access at all. */
  readonly allowedHosts: readonly string[];
}

/**
 * The production policy: nothing remote.
 *
 * Measured 2026-09-09 to cost nothing. The templates carry
 * `@import url("https://fonts.googleapis.com/…")` lines, but the PDF path never
 * loaded them: both the web export and the CLI compose the stylesheet as
 * reset + template + print + palette vars, so the `@import` is no longer the
 * first rule and CSS drops it. Chromium does not even attempt the request.
 *
 * A future change that vendors fonts locally keeps this list empty. A change
 * that wants remote fonts back has to fix the stylesheet order first and then
 * argue for the host here, in code review — deliberately not in a config file,
 * because a widening switch is one misconfigured deploy away from being the
 * vulnerability again.
 */
export const DENY_REMOTE: RenderNetworkPolicy = { allowedHosts: [] };

/**
 * Decides whether the renderer may issue this request.
 *
 * `data:`, `about:` and `blob:` carry no network traffic and are always
 * allowed — that is how the embedded photo reaches the page. Everything else
 * must be https, on a default port, without credentials, and on an exactly
 * matching allowlisted host. Exact matching is the point: `endsWith` would
 * accept `evil-fonts.googleapis.com`, `startsWith` would accept
 * `fonts.googleapis.com.evil.example`.
 */
export function isAllowedRenderRequest(url: string, policy: RenderNetworkPolicy): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === 'data:' || u.protocol === 'about:' || u.protocol === 'blob:') return true;
  if (u.protocol !== 'https:') return false;
  if (u.username !== '' || u.password !== '') return false;
  if (u.port !== '') return false;
  return policy.allowedHosts.includes(u.hostname);
}

export interface RenderNetworkHooks {
  /** Called for every intercepted request with the decision that was taken. */
  onDecision?(url: string, allowed: boolean): void;
}

/**
 * Installs the policy on a page. Must run before the document is set.
 *
 * Redirects need no special handling: Puppeteer reports every hop as its own
 * request event, so the policy is re-evaluated per hop and a redirect from an
 * allowed host to an internal address is refused at the second hop.
 *
 * `predicate` exists for tests only. `generatePDF` never passes it, so no
 * production path can widen the policy; without the seam the redirect test
 * cannot be written at all, because an https loopback listener would need
 * port 443 — root plus a certificate.
 */
export async function applyRenderNetworkPolicy(
  page: Page,
  policy: RenderNetworkPolicy = DENY_REMOTE,
  hooks?: RenderNetworkHooks,
  predicate: (url: string, policy: RenderNetworkPolicy) => boolean = isAllowedRenderRequest,
): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const allowed = predicate(req.url(), policy);
    hooks?.onDecision?.(req.url(), allowed);
    // Every intercepted request MUST be resolved or the page hangs waiting for
    // it. The catch covers the race where the request is already gone (page
    // closed by an abort signal mid-render).
    (allowed ? req.continue() : req.abort('blockedbyclient')).catch(() => {});
  });
}

/**
 * The Content-Security-Policy for the rendered document, derived from the same
 * policy object. Today both production callers take the default, so the two
 * layers state the same thing; the shared parameter is what keeps that true if
 * one of them ever passes a policy explicitly.
 *
 * This is not decoration: `<link rel=prefetch>` bypasses request interception
 * entirely, and the CSP is what stops it — measured. The reverse also holds: a
 * `<meta http-equiv=refresh>` bypasses the CSP and only the interception stops
 * it, so neither layer is redundant. Neither stops `preconnect`/`dns-prefetch`,
 * which open a TCP connection without issuing a request; nothing in the
 * rendered document can emit those today, but do not read this comment as a
 * completeness claim.
 *
 * It must be the first element in `<head>`, before the stylesheet — a meta
 * after `<style>` does not govern that stylesheet's `@import`.
 */
export function renderCsp(policy: RenderNetworkPolicy = DENY_REMOTE): string {
  const hosts = policy.allowedHosts.map((h) => `https://${h}`).join(' ');
  const styleSrc = hosts ? `'unsafe-inline' ${hosts}` : "'unsafe-inline'";
  const fontSrc = hosts || "'none'";
  return [
    `default-src 'none'`,
    'img-src data:',
    `style-src ${styleSrc}`,
    `font-src ${fontSrc}`,
    `base-uri 'none'`,
    `form-action 'none'`,
  ].join('; ');
}
