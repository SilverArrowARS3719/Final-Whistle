// Slows down password and code guessing in this browser: 5 free tries, then a wait that doubles with every
// further miss (30 s, 1 min, 2 min… up to 15 min). The server has its own per-network limit on top
// (Supabase > Authentication > Rate Limits), which is the one a script can't get around.

const KEY = 'fw-login-fails'
const FREE = 5
const BASE_MS = 30_000
const MAX_MS = 15 * 60_000

type Fails = { n: number; until: number }
const read = (): Fails => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return v && typeof v.n === 'number' && typeof v.until === 'number' ? v : { n: 0, until: 0 } } catch { return { n: 0, until: 0 } }
}
const write = (f: Fails | null) => { try { if (f) localStorage.setItem(KEY, JSON.stringify(f)); else localStorage.removeItem(KEY) } catch { /* not remembered */ } }

/** Wait after the nth miss, in ms. */
export const waitAfter = (n: number) => (n < FREE ? 0 : Math.min(MAX_MS, BASE_MS * 2 ** (n - FREE)))

/** Milliseconds until the next try is allowed (0 = go ahead). */
export const lockedFor = (now = Date.now()) => Math.max(0, read().until - now)

export function recordMiss(now = Date.now()) {
  const n = read().n + 1
  write({ n, until: now + waitAfter(n) })
}
export const clearMisses = () => write(null)

export const waitWords = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return s < 60 ? `${s} seconds` : `${Math.ceil(s / 60)} minute${s > 60 ? 's' : ''}`
}
