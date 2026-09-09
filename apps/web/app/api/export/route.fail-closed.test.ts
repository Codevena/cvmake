import { requiresVerifiedIp } from '@/lib/client-ip';
import { bootstrapTemplates } from '@codevena/cvmake-templates';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * The production refusal, in both directions.
 *
 * Get it wrong one way and the rate limit is decorative — every request keys on
 * a sentinel and shares one bucket, or worse, a bucket the caller chooses. Get
 * it wrong the other way and the demo's headline feature answers 503 for every
 * visitor. Neither direction had a test: disabling the whole block, and making
 * `requiresVerifiedIp()` return false unconditionally, both left the suite
 * green at 80/80.
 *
 * The renderer must not have started either way — that is the point of doing
 * this before anything expensive.
 */
const generatePDF = vi.fn(async (_html: string) => Buffer.from('%PDF-1.7\n', 'utf8'));
vi.mock('@codevena/cvmake-core/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codevena/cvmake-core/pdf')>();
  return { ...actual, generatePDF };
});

const BODY = {
  templateId: 'classic-serif',
  data: {
    meta: { locale: 'de' },
    personal: { firstName: 'M', lastName: 'W', contacts: {} },
    experience: [],
    education: [],
    rendering: { template: 'classic-serif' },
  },
};

async function post(headers: Record<string, string>) {
  const { POST } = await import('./route');
  generatePDF.mockClear();
  return POST(
    new Request('http://x/api/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(BODY),
    }),
  );
}

describe('requiresVerifiedIp', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is true only in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(requiresVerifiedIp()).toBe(true);
  });

  it.each(['development', 'test'])('is false in %s', (env) => {
    // `pnpm dev` and the test runner have no proxy in front of them. Treating
    // anything that is not production as trusted is the formulation that does
    // not silently break both.
    vi.stubEnv('NODE_ENV', env);
    expect(requiresVerifiedIp()).toBe(false);
  });
});

describe('POST /api/export — fail-closed on an unattributable request', () => {
  beforeAll(() => bootstrapTemplates());
  afterEach(() => vi.unstubAllEnvs());

  it('answers 503 in production when no header identifies the client', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await post({});
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ kind: 'client_unverified', reason: 'no-header' });
    expect(generatePDF).not.toHaveBeenCalled();
    // Deliberately no Retry-After: this is a misconfiguration, not overload,
    // and it does not clear on its own. Telling the client to come back shortly
    // would have it retry for ever.
    expect(res.headers.get('Retry-After')).toBeNull();
  });

  it('answers 503 when the chain ends inside the infrastructure', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = await post({ 'x-forwarded-for': '203.0.113.9, 172.18.0.1' });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ reason: 'infrastructure' });
    expect(generatePDF).not.toHaveBeenCalled();
  });

  it('lets a properly attributed request through in production', async () => {
    // The counter-probe, and the direction that matters most: without it a
    // change that refuses everything would look like a passing security fix.
    vi.stubEnv('NODE_ENV', 'production');
    const res = await post({ 'cf-connecting-ip': '203.0.113.44' });
    expect(res.status).toBe(200);
    expect(generatePDF).toHaveBeenCalledTimes(1);
  });

  it('does not refuse outside production, where there is no proxy', async () => {
    // `pnpm dev` has no forwarded headers at all. A fail-closed rule that also
    // fires here makes the editor unusable for whoever is developing it.
    const res = await post({});
    expect(res.status).toBe(200);
    expect(generatePDF).toHaveBeenCalledTimes(1);
  });
});
