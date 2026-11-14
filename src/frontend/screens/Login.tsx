import { useState, type FormEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, GoogleLogo } from '@phosphor-icons/react'
import { claimUsername, signIn, signInGoogle, signUp, type Account } from '../../backend/auth'
import { onlineReady } from '../../backend/supabase'

export type Profile = { name: string; email?: string }
const KEY = 'fw-profile'

// Profile lives only in this browser (no server, no passwords). Storage can be blocked, so every access is guarded.
export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}
export function saveProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p))
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable: the profile just won't be remembered next time
  }
}

const ease = [0.16, 1, 0.3, 1] as const

type Tab = 'signin' | 'signup' | 'offline'
type Props = {
  onDone: (p: Profile) => void // offline profile on this device
  pickUsernameFor?: string // signed-in account id that still needs a username
  onAccount: (a: Account) => void
}

export default function Login({ onDone, pickUsernameFor, onAccount }: Props) {
  const reduce = useReducedMotion()
  const [tab, setTab] = useState<Tab>(onlineReady ? 'signin' : 'offline')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (pickUsernameFor) return run(async () => onAccount(await claimUsername(pickUsernameFor, name.trim())))
    if (tab === 'offline') {
      if (!name.trim()) return setError('Enter a name so your friends know who built that XI.')
      const p = { name: name.trim().slice(0, 18) }
      saveProfile(p)
      return onDone(p)
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("That email doesn't look right.")
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    run(async () => {
      if (tab === 'signin') await signIn(email.trim(), password)
      else if ((await signUp(email.trim(), password)).needsConfirm) setNote('Check your inbox and click the link to confirm, then sign in.')
    })
  }

  const title = pickUsernameFor ? 'Pick a username' : tab === 'signup' ? 'Create account' : tab === 'signin' ? 'Sign in' : 'Play offline'
  return (
    <div className="login">
      <motion.div className="login-card" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease }}>
        <div className="login-art">
          <motion.img
            src="/img/login.jpg"
            alt="A football boot launching a glowing ball over a floodlit stadium"
            initial={reduce ? false : { scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease }}
          />
        </div>
        <form className="login-form" onSubmit={submit} noValidate>
          <div className="stack" style={{ gap: 6 }}>
            <h2>{title}</h2>
            {pickUsernameFor && <p className="dim small">This is how friends find you. It has to be unique, and you can't change it later.</p>}
          </div>
          <div className="stack" style={{ gap: 14 }}>
            {pickUsernameFor || tab === 'offline' ? (
              <label className="field">
                <span className="label">{pickUsernameFor ? 'Username' : 'Your name'}</span>
                <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} maxLength={18} placeholder={pickUsernameFor ? 'e.g. ravi_10' : 'e.g. Ravi'} autoFocus autoComplete="username" />
              </label>
            ) : (
              <>
                <label className="field">
                  <span className="label">Email</span>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="you@example.com" autoComplete="email" autoFocus />
                </label>
                <label className="field">
                  <span className="label">Password</span>
                  <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="At least 8 characters" autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} />
                </label>
              </>
            )}
            {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}
            {note && <p className="small accent" role="status">{note}</p>}
            <button className="btn primary lg" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? <span className="spin" aria-hidden /> : null}{pickUsernameFor ? 'Claim username' : tab === 'signup' ? 'Create account' : tab === 'signin' ? 'Sign in' : "Let's play"}{!busy && <ArrowRight weight="bold" />}
            </button>
            {onlineReady && !pickUsernameFor && tab !== 'offline' && (
              <>
                <button className="btn ghost" type="button" onClick={() => run(signInGoogle)}><GoogleLogo weight="bold" /> Continue with Google</button>
                <p className="small dim" style={{ textAlign: 'center' }}>
                  {tab === 'signin' ? 'New here? ' : 'Have an account? '}
                  <button type="button" className="linkish" onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setError('') }}>{tab === 'signin' ? 'Create an account' : 'Sign in'}</button>
                </p>
              </>
            )}
          </div>
          {!pickUsernameFor && (
            <div className="stack" style={{ gap: 12 }}>
              <div className="divider"><span>or</span></div>
              {tab === 'offline' ? (
                onlineReady
                  ? <button className="btn ghost" type="button" onClick={() => setTab('signin')}>Sign in to play with friends online</button>
                  : <p className="small faint" style={{ textAlign: 'center' }}>Online play isn't set up yet (see SETUP-ONLINE.md). Offline play saves on this device only.</p>
              ) : (
                <button className="btn ghost" type="button" onClick={() => setTab('offline')}>Play offline on this device</button>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </div>
  )
}
