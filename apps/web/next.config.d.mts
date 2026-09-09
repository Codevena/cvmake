/**
 * `next.config.mjs` is plain JavaScript, so importing it from a test is an
 * implicit `any` under `noImplicitAny`. This declares only the shape the CSP
 * test needs — enough to call `headers()` and read the values back, and no
 * more, so it cannot drift into a second source of truth for the config.
 */
declare const config: {
  headers(): Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
};
export default config;
