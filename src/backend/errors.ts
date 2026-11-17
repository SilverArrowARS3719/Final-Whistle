// Errors shown to players say what to do next, never how the server works: no table names, constraint
// names, SQL hints or whether an email has an account. The real error only goes to the console in development.

type Raw = { message?: string; code?: string; status?: number; name?: string } | null | undefined

const SAFE = {
  login: 'Wrong email or password.',
  slow: 'Too many tries. Wait a few minutes and try again.',
  denied: "You can't do that.",
  offline: "Can't reach the server. Check your connection and try again.",
  code: "That code didn't work. Check your app and try again.",
  generic: 'Something went wrong. Try again.',
}

export function friendly(e: Raw, taken = 'That already exists.'): string {
  if (!e) return SAFE.generic
  if (import.meta.env.DEV) console.warn('[server]', e)
  const code = e.code ?? ''
  const msg = e.message ?? ''
  // messages our own database functions raise (schema.sql) were written for players, so they pass through
  if (code === 'P0001') return msg
  if (code === '23505') return taken
  if (code === '42501' || code === 'PGRST301' || e.status === 401 || e.status === 403) return SAFE.denied
  if (e.status === 429 || /rate.limit|too many/i.test(code + msg)) return SAFE.slow
  if (code === 'invalid_credentials' || code === 'user_not_found') return SAFE.login
  if (code === 'mfa_verification_failed' || code === 'mfa_challenge_expired' || /totp|mfa/i.test(code)) return SAFE.code
  if (code === 'email_not_confirmed') return 'Confirm your email first (check your inbox), then log in.'
  if (code === 'weak_password') return 'Pick a stronger password: it needs to tick every rule.'
  // signing up with an email that already has an account: don't confirm that it does
  if (code === 'user_already_exists' || code === 'email_exists') return "Couldn't create that account. If you already have one, log in instead."
  if (e.name === 'TypeError' || /fetch|network/i.test(msg)) return SAFE.offline
  return SAFE.generic
}

/** Throws a player-safe error when a Supabase call failed. */
export const fail = (e: Raw, taken?: string) => { if (e) throw new Error(friendly(e, taken)) }
