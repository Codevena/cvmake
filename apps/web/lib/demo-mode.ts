// Public demo deploys set NEXT_PUBLIC_DEMO_MODE=true. In demo mode the editor
// never writes to disk: it loads the tracked example CV, keeps edits in
// browser memory only, and offers a YAML download instead of autosave.
// Local `pnpm dev` leaves the var unset and keeps the full save-to-disk flow.
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}
