import { isIP } from 'node:net';

/**
 * The one place that decides which client a request belongs to.
 *
 * It used to be a line inside the export route: the FIRST entry of
 * `x-forwarded-for`, unvalidated. That entry is written by the client, so a
 * fresh value per request bought a fresh rate-limit bucket and the limit did
 * nothing at all.
 *
 * The obvious repair — take the LAST entry instead, "the one the nearest proxy
 * appended" — is wrong here and would be worse than the bug. Behind Cloudflare
 * the nearest proxy is the platform's ingress, and what it appends is a
 * Cloudflare edge address: every visitor served by the same PoP would land in
 * one bucket and share five exports a minute between them. A limiter that
 * cannot be evaded because it locks everyone out is not an improvement.
 *
 * So the source is named explicitly rather than guessed, and what it is worth
 * is stated rather than assumed.
 */
/**
 * Is this address one of the app's own neighbours rather than a visitor?
 *
 * A forwarded chain that ends in a private, loopback or link-local address is
 * not telling us who the client is — it is telling us the name of the hop next
 * door, because something between that hop and this process did not forward
 * the header. Keying the limiter on it would put EVERY visitor of the site into
 * one bucket of five exports a minute: the same self-inflicted lockout the
 * comment above rejects for the Cloudflare case, reached from the other side.
 *
 * Measured on a Coolify/Traefik-shaped chain, these are the values that come
 * out: `172.18.0.1` (docker bridge), `10.0.0.6`, `127.0.0.1`.
 */
function isInfrastructureAddress(addr: string): boolean {
  const v = isIP(addr);
  if (v === 4) {
    const p = addr.split('.').map(Number);
    const [a = 0, b = 0] = p;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT, RFC 6598
    return false;
  }
  if (v === 6) {
    const lower = addr.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (/^f[cd]/.test(lower)) return true; // unique local, fc00::/7
    if (lower.startsWith('fe8') || lower.startsWith('fe9')) return true; // link-local
    if (lower.startsWith('fea') || lower.startsWith('feb')) return true;
    return false;
  }
  return false;
}

export type ClientIp =
  | { kind: 'ip'; key: string }
  | { kind: 'unverified'; reason: 'no-header' | 'malformed' | 'infrastructure' };

/**
 * Strips what proxies actually write around an address before anything looks at
 * it: `[2001:db8::1]:41234` and `1.2.3.4:5678` are both common, and both make a
 * bare `isIP()` return 0 — which would turn every legitimate IPv6 client into
 * an unverified one.
 */
function unwrap(raw: string): string {
  const v = raw.trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(v);
  if (bracketed?.[1]) return bracketed[1];
  // A single colon means host:port; several mean a bare IPv6 address.
  if (v.split(':').length === 2) return v.split(':')[0] ?? v;
  return v;
}

/**
 * IPv6 is bucketed by /64 because a single subscriber routinely holds a whole
 * /64 and rotating inside it is free.
 *
 * IPv4-mapped addresses (`::ffff:1.2.3.4`) must be unwrapped FIRST: their top
 * 64 bits are all zero, so truncating them would put every IPv4 visitor on a
 * dual-stack listener into one shared bucket — the same self-inflicted lockout
 * as above, arrived at from the other direction.
 */
function bucketKey(addr: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(addr);
  if (mapped?.[1]) return mapped[1];
  if (isIP(addr) !== 6) return addr;
  // Expand `::` before slicing: `2001:db8::1`.split(':') yields an empty group
  // where the compression sits, so taking the first four parts of the raw
  // string produces a key that is neither the prefix nor stable.
  const [head = '', tail = ''] = addr.includes('::') ? addr.split('::') : [addr, ''];
  const headGroups = head === '' ? [] : head.split(':');
  const tailGroups = tail === '' ? [] : tail.split(':');
  const fill = addr.includes('::') ? 8 - headGroups.length - tailGroups.length : 0;
  const groups = [...headGroups, ...Array(Math.max(0, fill)).fill('0'), ...tailGroups];
  return `${groups.slice(0, 4).join(':')}::/64`;
}

/**
 * `CF-Connecting-IP` is written by Cloudflare and is the only header in this
 * chain that names the visitor rather than a hop.
 *
 * Its worth is exactly the unreachability of the origin: anyone who can talk to
 * the origin server directly can send this header themselves. That is a
 * deployment property, not a code property, and it is not decided here — it is
 * stated: if the origin is reachable outside the proxy, this resolver is
 * advisory and so is the rate limit built on it. It is still strictly better
 * than the previous behaviour, which trusted a header any browser can set.
 */
export function resolveClientIp(headers: {
  get(name: string): string | null;
}): ClientIp {
  const cf = headers.get('cf-connecting-ip');
  if (cf !== null && cf.trim() !== '') {
    const addr = unwrap(cf);
    return isIP(addr)
      ? { kind: 'ip', key: bucketKey(addr) }
      : { kind: 'unverified', reason: 'malformed' };
  }

  const xff = headers.get('x-forwarded-for');
  if (xff !== null && xff.trim() !== '') {
    // Without Cloudflare the last entry IS the one the nearest trusted proxy
    // appended. With Cloudflare we never get here, because it always sets its
    // own header first.
    const parts = xff.split(',').filter((p) => p.trim() !== '');
    const last = parts[parts.length - 1];
    if (last !== undefined) {
      const addr = unwrap(last);
      if (!isIP(addr)) return { kind: 'unverified', reason: 'malformed' };
      // An internal address here means a hop swallowed the real chain. Saying
      // "I do not know" is honest and, in production, loud; pretending that the
      // docker bridge is the visitor would throttle the entire site silently.
      if (isInfrastructureAddress(addr)) {
        return { kind: 'unverified', reason: 'infrastructure' };
      }
      return { kind: 'ip', key: bucketKey(addr) };
    }
  }

  return { kind: 'unverified', reason: 'no-header' };
}

/**
 * Whether an unverifiable client may proceed.
 *
 * Only a real deployment refuses. Development and the test runner have no proxy
 * in front of them and must keep working — `NODE_ENV` has three values, and
 * treating anything that is not `production` as trusted is the formulation that
 * does not silently break the suite.
 */
export function requiresVerifiedIp(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** The key used when no proxy is expected, so local runs share one bucket. */
export const LOCAL_KEY = 'local';
