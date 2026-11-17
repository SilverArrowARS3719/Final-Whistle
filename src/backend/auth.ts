import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { fail } from './errors'

export type Account = { id: string; username: string }
export const USERNAME_RULE = /^[A-Za-z0-9_]{3,18}$/

// Signed-in session plus the username profile (null until they pick one).
// needsCode: the password was right but two-step login is on, so the 6-digit code comes next.
// Until then the database treats the session as signed out (public.me() in schema.sql).
export function useAccount() {
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [needsCode, setNeedsCode] = useState(false)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // re-check only when who is signed in, or how far they got (password, then code), changes; not on every token refresh
  const key = session ? `${session.user.id}:${aalOf(session)}` : ''
  useEffect(() => {
    if (!supabase) return
    if (!session) {
      setAccount(null)
      setNeedsCode(false)
      setLoading(false)
      return
    }
    let live = true
    if (!account) setLoading(true) // already in (e.g. just turned two-step on): refresh quietly, no boot screen
    ;(async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const code = aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'
      const profile = code ? null : (await supabase.from('profiles').select('id, username').eq('id', session.user.id).maybeSingle()).data
      if (!live) return
      setNeedsCode(code)
      setAccount(profile as Account | null)
      setLoading(false)
    })()
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return { session, account, setAccount, needsCode, loading }
}

// "aal1" after the password, "aal2" after the 6-digit code (read from the session token, no network)
const aalOf = (s: Session) => {
  try { return String(JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal ?? '') } catch { return '' }
}

export async function signUp(email: string, password: string, birthYear?: number) {
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: birthYear ? { birth_year: birthYear } : undefined } })
  fail(error)
  return { needsConfirm: !data.session }
}
export async function signIn(email: string, password: string) {
  fail((await supabase!.auth.signInWithPassword({ email, password })).error)
}
export type Provider = 'google' | 'azure' // azure = Microsoft accounts in Supabase
export async function signInWith(provider: Provider) {
  fail((await supabase!.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })).error)
}
/** Deletes the signed-in account and everything tied to it on the server, then signs out. */
export async function deleteMyAccount() {
  fail((await supabase!.rpc('delete_my_account')).error)
  await supabase!.auth.signOut()
}
export async function signOut() {
  await supabase!.auth.signOut()
}

// Claims a username. Uniqueness is enforced by the database; a clash comes back as a friendly error.
export async function claimUsername(id: string, username: string): Promise<Account> {
  if (!USERNAME_RULE.test(username)) throw new Error('3 to 18 letters, numbers or underscores.')
  const { data, error } = await supabase!.from('profiles').insert({ id, username }).select('id, username').single()
  fail(error, `"${username}" is taken. Try another.`)
  return data as Account
}

// ---------- two-step login: a 6-digit code from an authenticator app after the password ----------
export const CODE_RULE = /^\d{6}$/

/** The verified authenticator, if two-step login is on. */
export async function twoStepFactor(): Promise<string | null> {
  const { data, error } = await supabase!.auth.mfa.listFactors()
  fail(error)
  return data?.totp[0]?.id ?? null
}

/** Starts turning it on: returns the QR code to scan and the same secret as text for typing in by hand. */
export async function startTwoStep(): Promise<{ factorId: string; qr: string; secret: string }> {
  const { data: list } = await supabase!.auth.mfa.listFactors()
  // a setup that was started and never finished blocks a new one, so clear it first
  for (const f of list?.all ?? []) if (f.status === 'unverified') await supabase!.auth.mfa.unenroll({ factorId: f.id })
  const { data, error } = await supabase!.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator ${Date.now()}` })
  fail(error)
  const qr = data!.totp.qr_code
  return { factorId: data!.id, qr: qr.startsWith('data:') ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`, secret: data!.totp.secret }
}

/** Checks a code against an authenticator: finishes setup, or completes a sign-in. */
export async function verifyCode(factorId: string, code: string) {
  if (!CODE_RULE.test(code)) throw new Error('The code is 6 digits.')
  fail((await supabase!.auth.mfa.challengeAndVerify({ factorId, code })).error)
}

/** Turns two-step login off. The server only allows it from a session that already passed the code. */
export async function stopTwoStep(factorId: string) {
  fail((await supabase!.auth.mfa.unenroll({ factorId })).error)
}
