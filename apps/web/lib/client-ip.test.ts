import { describe, expect, it } from 'vitest';
import { resolveClientIp } from './client-ip';

const h = (headers: Record<string, string>) => ({
  get: (name: string) => headers[name.toLowerCase()] ?? null,
});

describe('resolveClientIp', () => {
  it('ignores what the client wrote at the front of the forwarded chain', () => {
    // The old code took this first entry, so any client could mint a fresh
    // rate-limit bucket per request simply by changing it.
    expect(resolveClientIp(h({ 'x-forwarded-for': '9.9.9.9, 1.2.3.4' }))).toEqual({
      kind: 'ip',
      key: '1.2.3.4',
    });
  });

  it('prefers the header Cloudflare writes over the forwarded chain', () => {
    // Behind Cloudflare the last chain entry is an edge address, which would
    // put every visitor of one PoP into a single bucket.
    expect(
      resolveClientIp(h({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' })),
    ).toEqual({ kind: 'ip', key: '1.2.3.4' });
  });

  it('accepts an address a proxy wrapped in brackets and a port', () => {
    // RFC 7239 form. A bare isIP() call returns 0 for this, which would make
    // every legitimate IPv6 visitor unverified — and unverified means refused.
    expect(resolveClientIp(h({ 'cf-connecting-ip': '[2001:db8::1]:41234' }))).toEqual({
      kind: 'ip',
      key: '2001:db8:0:0::/64',
    });
    expect(resolveClientIp(h({ 'cf-connecting-ip': '1.2.3.4:5678' }))).toEqual({
      kind: 'ip',
      key: '1.2.3.4',
    });
  });

  it('does not collapse IPv4-mapped addresses into one bucket', () => {
    // The top 64 bits of ::ffff:x are zero, so a naive /64 truncation would
    // give every IPv4 visitor on a dual-stack listener the same key.
    expect(resolveClientIp(h({ 'cf-connecting-ip': '::ffff:1.2.3.4' }))).toEqual({
      kind: 'ip',
      key: '1.2.3.4',
    });
    expect(resolveClientIp(h({ 'cf-connecting-ip': '::ffff:5.6.7.8' }))).toEqual({
      kind: 'ip',
      key: '5.6.7.8',
    });
  });

  it('buckets real IPv6 by /64', () => {
    // A single subscriber usually holds a whole /64, so rotating inside it is
    // free and per-address keys would be pointless.
    expect(resolveClientIp(h({ 'cf-connecting-ip': '2001:db8:0:0:1:2:3:4' }))).toEqual({
      kind: 'ip',
      key: '2001:db8:0:0::/64',
    });
  });

  it('reports garbage as unverified instead of using it as a key', () => {
    expect(resolveClientIp(h({ 'x-forwarded-for': 'nonsense' }))).toEqual({
      kind: 'unverified',
      reason: 'malformed',
    });
  });

  it.each([
    ['172.18.0.1', 'the docker bridge'],
    ['127.0.0.1', 'loopback'],
    ['10.0.0.6', 'a private network'],
    ['192.168.1.5', 'a home network'],
    ['169.254.10.1', 'link-local'],
    ['100.64.0.1', 'carrier NAT'],
    ['::1', 'IPv6 loopback'],
    ['fd00::1', 'an IPv6 unique-local address'],
    ['fe80::1', 'IPv6 link-local'],
  ])('refuses to key on %s (%s)', (addr) => {
    // A chain that ends inside the infrastructure is not naming the visitor —
    // it is naming the hop next door, because something in between dropped the
    // real chain. Keying on it would put every visitor of the whole site into
    // one bucket of five exports a minute: a limiter that cannot be evaded
    // because it locks everyone out is not an improvement over one that does
    // nothing.
    const r = resolveClientIp(h({ 'x-forwarded-for': `203.0.113.9, ${addr}` }));
    expect(r.kind).toBe('unverified');
    if (r.kind === 'unverified') expect(r.reason).toBe('infrastructure');
  });

  it.each([
    ['203.0.113.9', 'a documentation-range public address'],
    ['8.8.8.8', 'a public address'],
    ['172.32.0.1', 'just outside the 172.16/12 private block'],
    ['192.169.0.1', 'just outside 192.168/16'],
    ['100.128.0.1', 'just outside the CGNAT block'],
    ['2001:db8::1', 'public IPv6'],
  ])('still keys on %s (%s)', (addr) => {
    // The counter-probe, and it is doing real work: the ranges are adjacent to
    // real public space, so an off-by-one in the private-range test would
    // silently turn genuine clients into 503s in production.
    const r = resolveClientIp(h({ 'x-forwarded-for': `10.0.0.1, ${addr}` }));
    expect(r.kind).toBe('ip');
  });

  it('reports a missing chain as unverified', () => {
    expect(resolveClientIp(h({}))).toEqual({ kind: 'unverified', reason: 'no-header' });
  });
});
