// Cookie and storage consent. "necessary" = only what the game needs to work (saved games, settings,
// sign-in). "all" also allows the anonymous usage stats. Nothing optional runs until someone says yes.
export type Consent = 'all' | 'necessary'
const KEY = 'fw-consent'
const subs = new Set<(c: Consent | null) => void>()

export function consent(): Consent | null {
  try { const v = localStorage.getItem(KEY); return v === 'all' || v === 'necessary' ? v : null } catch { return null }
}
export function setConsent(c: Consent) {
  try {
    localStorage.setItem(KEY, c)
    // saying no also clears anything optional already stored here
    if (c === 'necessary') ['fw-device', 'fw-events', 'fw-first-seen'].forEach((k) => localStorage.removeItem(k))
  } catch { /* private mode: asked again next visit */ }
  subs.forEach((f) => f(c))
}
export function onConsent(fn: (c: Consent | null) => void) { subs.add(fn); return () => { subs.delete(fn) } }
