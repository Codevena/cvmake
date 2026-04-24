export interface ResolveSectionOrderInput {
  override: string[] | undefined;
  defaults: string[];
  hidden: string[];
}

export function resolveSectionOrder(input: ResolveSectionOrderInput): string[] {
  const hidden = new Set(input.hidden);
  const base = input.override && input.override.length > 0 ? input.override : input.defaults;
  const result = [...base];
  for (const d of input.defaults) {
    if (!result.includes(d)) result.push(d);
  }
  return result.filter((s) => !hidden.has(s));
}
