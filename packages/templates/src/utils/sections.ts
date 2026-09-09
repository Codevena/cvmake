export interface ResolveSectionOrderInput {
  override: string[] | undefined;
  defaults: string[];
  hidden: string[];
}

export function resolveSectionOrder(input: ResolveSectionOrderInput): string[] {
  const hidden = new Set(input.hidden);
  const base = input.override && input.override.length > 0 ? input.override : input.defaults;
  // Deduplicate the override defensively. The schema rejects a duplicate before
  // it can be stored, but this function is the renderer's entry point and a
  // caller that skips validation would otherwise render a section twice. The
  // templates key their sections by fixed strings (`key="experience"`), so
  // React does warn about the duplicate key — into a server-side console
  // nobody is reading during a PDF render, while the PDF itself comes out with
  // the section in it twice and exit 0.
  const result: string[] = [];
  for (const s of base) {
    if (!result.includes(s)) result.push(s);
  }
  for (const d of input.defaults) {
    if (!result.includes(d)) result.push(d);
  }
  return result.filter((s) => !hidden.has(s));
}
