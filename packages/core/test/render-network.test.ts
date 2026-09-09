import { describe, expect, it } from 'vitest';
import {
  DENY_REMOTE,
  type RenderNetworkPolicy,
  isAllowedRenderRequest,
  renderCsp,
} from '../src/render-network.js';

describe('isAllowedRenderRequest under the production policy', () => {
  // If one of these ever passes, the renderer can reach an attacker-chosen
  // address again. The "what happens without the mechanism" number for these
  // is measured where it is real — in render-network.integration.test.ts,
  // where the same URL produces 1 listener hit with the policy removed.
  const denied = [
    'http://127.0.0.1:9/x.jpg',
    'http://169.254.169.254/latest/meta-data/',
    'https://192.168.178.198/',
    'file:///etc/passwd',
    'https://fonts.googleapis.com/css2?family=Inter',
    'not a url',
  ];
  for (const url of denied) {
    it(`denies ${url}`, () => {
      expect(isAllowedRenderRequest(url, DENY_REMOTE)).toBe(false);
    });
  }

  // Counter-probes: these must stay allowed, or the embedded photo disappears
  // from every exported PDF.
  const allowed = ['data:image/png;base64,AAAA', 'blob:https://example.com/uuid', 'about:blank'];
  for (const url of allowed) {
    it(`allows ${url}`, () => {
      expect(isAllowedRenderRequest(url, DENY_REMOTE)).toBe(true);
    });
  }
});

describe('isAllowedRenderRequest against a test policy with one allowed host', () => {
  // These rows exercise the predicate, NOT the production configuration: under
  // DENY_REMOTE every branch after the data:/about:/blob: check is decision-dead.
  // They stay because they are the guards for a future re-widening of the list —
  // remove them and a later `allowedHosts: ['x']` is silently unsafe.
  const policy: RenderNetworkPolicy = { allowedHosts: ['fonts.googleapis.com'] };

  it.each([
    ['https://fonts.googleapis.com/css2', true, 'plain positive'],
    ['https://FONTS.GOOGLEAPIS.COM/css2', true, 'hostname normalisation'],
    ['https://fonts.googleapis.com:443/x', true, 'default port'],
    ['https://fonts.googleapis.com.evil.example/', false, 'suffix on the right'],
    ['https://evil-fonts.googleapis.com/', false, 'suffix on the left — guards exact matching'],
    ['https://user@fonts.googleapis.com/', false, 'userinfo'],
    ['https://fonts.googleapis.com:8443/', false, 'foreign port'],
    ['https://fonts.googleapis.com./', false, 'trailing dot'],
    ['http://fonts.googleapis.com/css2', false, 'scheme is mandatory'],
  ])('%s → %s (%s)', (url, expected) => {
    expect(isAllowedRenderRequest(url as string, policy)).toBe(expected);
  });

  it('an exact host comparison is what makes the two suffix rows fail', () => {
    // Pins the mechanism, not just the outcome: a hostname.endsWith(host)
    // implementation would accept evil-fonts.googleapis.com, a startsWith one
    // would accept fonts.googleapis.com.evil.example.
    const host = 'fonts.googleapis.com';
    expect('evil-fonts.googleapis.com'.endsWith(host)).toBe(true);
    expect(isAllowedRenderRequest('https://evil-fonts.googleapis.com/', policy)).toBe(false);
    expect('fonts.googleapis.com.evil.example'.startsWith(host)).toBe(true);
    expect(isAllowedRenderRequest('https://fonts.googleapis.com.evil.example/', policy)).toBe(
      false,
    );
  });
});

describe('renderCsp', () => {
  it('forbids everything but embedded images under the production policy', () => {
    const csp = renderCsp(DENY_REMOTE);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('img-src data:');
    // `data:` is allowed because the templates embed their vendored fonts that
    // way; a data: URI carries no request, so this is not an egress path.
    expect(csp).toContain('font-src data:');
    expect(csp).not.toContain('http');
  });

  it('names an allowed host in style-src and font-src when the policy has one', () => {
    const csp = renderCsp({ allowedHosts: ['fonts.example'] });
    expect(csp).toContain("style-src 'unsafe-inline' https://fonts.example");
    expect(csp).toContain('font-src data: https://fonts.example');
  });
});
