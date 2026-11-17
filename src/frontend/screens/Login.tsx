import { Fragment, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import AgeWheel from '../components/AgeWheel'
import { LogoBadge } from '../components/Logo'
import Kicko, { type Pose } from '../components/Kicko'
import PasswordField from '../components/PasswordField'
import Backdrop from '../components/Backdrop'
import { APP_NAME, LEGAL } from '../../game/engine/config'
import { openLegal } from './Legal'
import { passes } from '../../game/engine/password'
import { sfx } from '../../game/engine/sfx'
import { claimUsername, signIn, signInWith, signUp, type Account, type Provider } from '../../backend/auth'
import { onlineReady } from '../../backend/supabase'

export type Profile = { name: string; email?: string; birthYear?: number }
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
const OPEN_ON = 'fw-login-open' // set by a "Log in" or "Create account" button elsewhere; read once
export function openLoginOn(mode: 'login' | 'create') { try { sessionStorage.setItem(OPEN_ON, mode) } catch { /* opens on create */ } }
function takeOpenOn(): 'login' | 'create' | null {
  try { const v = sessionStorage.getItem(OPEN_ON); sessionStorage.removeItem(OPEN_ON); return v === 'login' || v === 'create' ? v : null } catch { return null }
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
const MIN_ONLINE_AGE = LEGAL.minAge // accounts with friends and online play; offline play has no age limit
const NOT_ON = "Online sign-in isn't switched on yet. Tap Play offline below; your progress on this device is kept."

// Two steps: who you are (email and password, or Google / Microsoft), then how old you are.
// Signing in to an existing account skips the second step.
type Mode = 'create' | 'login' | 'offline'
type Step = 'details' | 'age'
type Props = {
  onDone: (p: Profile) => void // offline profile on this device
  pickUsernameFor?: string // signed-in account id that still needs a username
  onAccount: (a: Account) => void
  onBack?: () => void // back to the mode slideshow
}

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
  </svg>
)
const MicrosoftMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden width="19" height="19">
    <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" /><rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
    <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" /><rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
  </svg>
)

// The card flies in from deep in the sky; everything inside follows a beat later.
const fly = {
  hidden: { opacity: 0, y: 220, z: -700, rotateX: 42, rotateZ: -6, scale: 0.6, filter: 'blur(20px)' },
  shown: { opacity: 1, y: 0, z: 0, rotateX: 0, rotateZ: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 90, damping: 16, mass: 1.1, when: 'beforeChildren' as const, staggerChildren: 0.06 } },
}
const rise = { hidden: { opacity: 0, y: 18, filter: 'blur(6px)' }, shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease } } }

export default function Login({ onDone, pickUsernameFor, onAccount, onBack }: Props) {
  const reduce = useReducedMotionConfig()
  const thisYear = new Date().getFullYear()
  const saved = loadProfile()
  // dev only: ?auth=login previews signing in to an existing account
  const preview = import.meta.env.DEV ? new URLSearchParams(location.search).get('auth') : null
  const [mode, setMode] = useState<Mode>(() => takeOpenOn() ?? (preview === 'login' ? 'login' : 'create'))
  const [step, setStep] = useState<Step>('details')
  const [via, setVia] = useState<Provider | null>(null) // a social button sent us to the age step
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthYear, setBirthYear] = useState(saved?.birthYear ?? thisYear - 16)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [young, setYoung] = useState(false) // under the online age: playing on this device is their way in
  const [focus, setFocus] = useState<'text' | 'password' | null>(null)
  // never pre-ticked: an account needs an active yes to the terms, and a parent's yes when under 16
  const [agreed, setAgreed] = useState(false)
  const [parentOk, setParentOk] = useState(false)
  const needsParent = thisYear - birthYear < LEGAL.parentAge

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const switchTo = (m: Mode) => { setMode(m); setStep(m === 'offline' ? 'age' : 'details'); setVia(null); setError(''); setNote(''); setRevealed(false) }
  const tooYoung = () => thisYear - birthYear < MIN_ONLINE_AGE

  const social = (p: Provider) => {
    sfx.kick()
    if (!onlineReady) return setError(NOT_ON)
    setVia(p); setMode('create'); setStep('age'); setError('')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    sfx.kick()
    if (pickUsernameFor) return run(async () => onAccount(await claimUsername(pickUsernameFor, name.trim())))

    if (mode === 'offline') {
      if (!name.trim()) return setError('Enter a name so your friends know who built that XI.')
      const p = { name: name.trim().slice(0, 18), birthYear }
      saveProfile(p)
      return onDone(p)
    }
    if (step === 'details') {
      if (!onlineReady) return setError(NOT_ON)
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("That email doesn't look right.")
      if (mode === 'login') {
        if (!password) return setError('Enter your password.')
        return run(() => signIn(email.trim(), password))
      }
      if (!passes(password, email)) return setError('Your password needs to tick every rule. Or tap "Suggest a strong one".')
      setStep('age'); setRevealed(false); setError('')
      return
    }
    // age step: only now is the account actually created
    if (tooYoung()) { setYoung(true); return setError(`Online accounts are for ${MIN_ONLINE_AGE} and over. You can still play on this device: tap Play offline below.`) }
    if (!agreed) return setError('Please agree to the terms and privacy policy to create an account.')
    if (needsParent && !parentOk) return setError(`Under ${LEGAL.parentAge}? A parent or guardian needs to agree first. Ask them to tick the box with you.`)
    saveProfile({ ...(saved ?? { name: '' }), birthYear })
    if (via) return run(() => signInWith(via))
    run(async () => {
      if ((await signUp(email.trim(), password, birthYear)).needsConfirm) setNote('Check your inbox and click the link to confirm, then log in.')
    })
  }

  const cta = pickUsernameFor ? 'Claim username'
    : mode === 'offline' ? "Let's play"
    : step === 'age' ? 'Create account'
    : mode === 'login' ? 'Log in' : 'Continue'
  const pose: Pose = error ? 'card' : revealed ? 'hide' : step === 'age' ? 'cheer' : focus === 'password' ? 'think' : focus === 'text' ? 'point' : 'wave'
  const field = (label: string, input: React.ReactNode) => <motion.label variants={rise} className="field">{input}<span className="sr-only">{label}</span></motion.label>

  return (
    <div className={`login ${revealed ? 'private' : ''}`}>
      <Backdrop src="/img/xi.jpg" zoomSeconds={14} />
      {/* privacy glass: frosts the stadium while the password is on show */}
      <AnimatePresence>
        {revealed && <motion.div className="privacy-glass" aria-hidden initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }} exit={{ opacity: 0, clipPath: 'inset(0 0 0 100%)' }} transition={{ duration: 0.55, ease }} />}
      </AnimatePresence>

      {onBack && (
        <motion.button type="button" className="login-back" onClick={onBack} aria-label="Back to the modes" title="Back to the modes"
          initial={reduce ? false : { opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.4, ease }}>
          <ArrowLeft weight="bold" />
        </motion.button>
      )}
      <motion.form className="login-card" onSubmit={submit} noValidate variants={fly} initial={reduce ? 'shown' : 'hidden'} animate="shown" style={{ transformPerspective: 1400 }}>
        {/* the F drops in from the sky and settles at the top of the card */}
        <div className="login-ball"><LogoBadge size={76} /></div>
        {/* Kicko peeks over the card: leans in while you type, ducks out of sight when the password shows */}
        <motion.div className="login-kicko" initial={reduce ? false : { y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 1.1 }}>
          <Kicko pose={pose} size={104} />
        </motion.div>

        <motion.h1 variants={rise} className="login-title">{pickUsernameFor ? 'Pick a username' : APP_NAME}</motion.h1>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={pickUsernameFor ? 'u' : `${mode}-${step}`} className="login-fields"
            initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease } }} exit={{ opacity: 0, x: -40, filter: 'blur(8px)', transition: { duration: 0.2 } }}>
            {pickUsernameFor ? (
              field('Username', <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} onFocus={() => setFocus('text')} onBlur={() => setFocus(null)} maxLength={18} placeholder="Username, e.g. ravi_10" autoFocus autoComplete="username" />)
            ) : step === 'details' ? (
              <>
                {field('Email', <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} onFocus={() => setFocus('text')} onBlur={() => setFocus(null)} placeholder="Email" autoComplete="email" />)}
                <motion.div variants={rise} onFocus={() => setFocus('password')} onBlur={() => setFocus(null)}>
                  <PasswordField value={password} onChange={(v) => { setPassword(v); setError('') }} email={email} create={mode === 'create'} onReveal={setRevealed} />
                </motion.div>
              </>
            ) : (
              <>
                <p className="login-lead">{mode === 'offline' ? 'Who\'s playing, and when were you born?' : 'Last thing: when were you born?'}</p>
                {mode === 'offline' && field('Your name', <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} maxLength={18} placeholder="Your name" autoFocus autoComplete="nickname" />)}
                <AgeWheel value={birthYear} onChange={setBirthYear} label={mode === 'offline' ? 'Year of birth' : `Year of birth · ${MIN_ONLINE_AGE}+ for online`} />
                {mode !== 'offline' && (
                  <div className="consents">
                    <label className="check">
                      <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError('') }} />
                      <span>I agree to the <button type="button" className="linkish" onClick={() => openLegal('Terms')}>terms</button> and <button type="button" className="linkish" onClick={() => openLegal('Privacy')}>privacy policy</button>.</span>
                    </label>
                    {needsParent && !tooYoung() && (
                      <label className="check">
                        <input type="checkbox" checked={parentOk} onChange={(e) => { setParentOk(e.target.checked); setError('') }} />
                        <span>I'm under {LEGAL.parentAge} and a parent or guardian has agreed to me having an account.</span>
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && <p className="small login-msg" role="alert">{error}</p>}
        {note && <p className="small accent login-msg" role="status">{note}</p>}

        <motion.button variants={rise} className="login-cta" type="submit" disabled={busy} aria-busy={busy} whileTap={reduce ? undefined : { scale: 0.97 }}>
          {cta}<ArrowRight weight="bold" />
        </motion.button>

        {!pickUsernameFor && step === 'details' && (
          <motion.div variants={rise} className="login-social">
            <div className="divider"><span>or log in with</span></div>
            <div className="social-row">
              <button type="button" className="social-ico" onClick={() => social('google')}><GoogleMark /><span>Google</span></button>
              <button type="button" className="social-ico" onClick={() => social('azure')}><MicrosoftMark /><span>Microsoft</span></button>
            </div>
          </motion.div>
        )}

        {!pickUsernameFor && (
          <motion.p variants={rise} className="login-alt small">
            {/* offline is only offered when an account isn't possible: sign-in switched off, or too young for one */}
            {[
              step === 'age' && mode !== 'offline' && <button type="button" className="linkish" onClick={() => { setStep('details'); setVia(null); setError('') }}><ArrowLeft weight="bold" /> Back</button>,
              mode === 'create' && step === 'details' && <>Have an account? <button type="button" className="linkish" onClick={() => switchTo('login')}>Log in</button></>,
              mode === 'login' && <>New here? <button type="button" className="linkish" onClick={() => switchTo('create')}>Create an account</button></>,
              mode === 'offline'
                ? <button type="button" className="linkish" onClick={() => switchTo('create')}>Use an account instead</button>
                : (!onlineReady || young) && <button type="button" className="linkish" onClick={() => switchTo('offline')}>Play offline</button>,
            ].filter(Boolean).map((part, k) => <Fragment key={k}>{k > 0 && ' · '}{part}</Fragment>)}
            <br /><span className="login-legal"><button type="button" className="linkish" onClick={() => openLegal('Privacy')}>Privacy</button> · <button type="button" className="linkish" onClick={() => openLegal('Terms')}>Terms</button> · <button type="button" className="linkish" onClick={() => openLegal('Cookies')}>Cookies</button></span>
          </motion.p>
        )}
      </motion.form>
    </div>
  )
}
