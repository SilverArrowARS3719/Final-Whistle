// Cookie consent. "necessary" = only what the game needs to work (saved games, settings, sign-in).
// "all" also allows the anonymous usage stats. Nothing optional runs until someone says yes.
// The choice itself lives in a first-party cookie that expires after six months, so people are asked again.
export type Consent = 'all' | 'necessary'
export const CONSENT_COOKIE = 'fw_consent'
const MAX_AGE = 60 * 60 * 24 * 182 // six months
const subs = new Set<(c: Consent | null) => void>()

const readCookie = (): string | null => {
  try { return document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.split('=')[1] ?? null } catch { return null }
}
const writeCookie = (v: string, age: number) => {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  try { document.cookie = `${CONSENT_COOKIE}=${v}; Max-Age=${age}; Path=/; SameSite=Lax${secure}` } catch { /* cookies blocked: asked again next visit */ }
}
// the choice used to sit in localStorage; drop it so everyone makes it once more, as a cookie
try { localStorage.removeItem('fw-consent') } catch { /* private mode */ }

export function consent(): Consent | null {
  const v = readCookie()
  return v === 'all' || v === 'necessary' ? v : null
}
export function setConsent(c: Consent) {
  writeCookie(c, MAX_AGE)
  // saying no also clears anything optional already stored here
  if (c === 'necessary') try { ['fw-device', 'fw-events', 'fw-first-seen'].forEach((k) => localStorage.removeItem(k)) } catch { /* private mode */ }
  subs.forEach((f) => f(c))
}
/** Forget the choice: the banner comes back so it can be made again. */
export function resetConsent() {
  writeCookie('', 0)
  subs.forEach((f) => f(null))
}
export function onConsent(fn: (c: Consent | null) => void) { subs.add(fn); return () => { subs.delete(fn) } }
