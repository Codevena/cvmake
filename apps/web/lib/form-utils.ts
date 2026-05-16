// With exactOptionalPropertyTypes:true the Phase-7 Input/Textarea/Select primitives
// reject an explicit `error: undefined`. This helper spreads the prop only when a
// validation message actually exists, satisfying the type constraint across all
// section components.
export function errProp(message: string | undefined): { error: string } | Record<string, never> {
  return message ? { error: message } : {};
}
