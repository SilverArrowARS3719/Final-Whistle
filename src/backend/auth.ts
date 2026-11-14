import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Account = { id: string; username: string }
export const USERNAME_RULE = /^[A-Za-z0-9_]{3,18}$/

// Signed-in session plus the username profile (null until they pick one).
export function useAccount() {
  const [session, setSession] = useState<Session | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    if (!session) {
      setAccount(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase.from('profiles').select('id, username').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { setAccount(data as Account | null); setLoading(false) })
  }, [session])

  return { session, account, setAccount, loading }
}

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase!.auth.signUp({ email, password })
  fail(error)
  return { needsConfirm: !data.session }
}
export async function signIn(email: string, password: string) {
  fail((await supabase!.auth.signInWithPassword({ email, password })).error)
}
export async function signInGoogle() {
  fail((await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })).error)
}
export async function signOut() {
  await supabase!.auth.signOut()
}

// Claims a username. Uniqueness is enforced by the database; a clash comes back as a friendly error.
export async function claimUsername(id: string, username: string): Promise<Account> {
  if (!USERNAME_RULE.test(username)) throw new Error('3 to 18 letters, numbers or underscores.')
  const { data, error } = await supabase!.from('profiles').insert({ id, username }).select('id, username').single()
  if (error) throw new Error(error.code === '23505' ? `"${username}" is taken. Try another.` : error.message)
  return data as Account
}
