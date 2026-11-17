import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PaperPlaneTilt, X } from '@phosphor-icons/react'
import { askDue, loadAsk, saveAsk, sendFeedback } from '../../backend/feedback'
import { onlineReady } from '../../backend/supabase'
import { onProgress } from '../../game/engine/progress'
import { VERSION } from '../changelog'
import { loadProfile } from '../screens/Login'
import Kicko from './Kicko'

type From = 'menu' | 'profile' | 'settings' | 'nudge'
/** Open the feedback pop-up from anywhere. */
export const openFeedback = (from: From = 'menu') => dispatchEvent(new CustomEvent('fw-feedback', { detail: from }))

// Who is signed in, set by Root (the pop-up lives outside it, next to Settings).
let who: string | null = null
export const setFeedbackUser = (username: string | null) => { who = username }

const ease = [0.16, 1, 0.3, 1] as const

/** The feedback pop-up: who you are at the top, your message below. Also asks now and then after a finished game. */
export default function Feedback() {
  const [from, setFrom] = useState<From | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const username = who
  const known = username ?? loadProfile()?.name ?? ''

  useEffect(() => {
    const open = (e: Event) => {
      setFrom((e as CustomEvent<From>).detail ?? 'menu')
      setName(who ?? loadProfile()?.name ?? ''); setMessage(''); setError(''); setSent(false)
    }
    addEventListener('fw-feedback', open)
    // now and then, a few seconds after a finished game (once the result has sunk in)
    let timer = 0
    const off = onProgress((p, _earned, ev) => {
      if (ev?.kind !== 'game' || !askDue(loadAsk(), p.stats.played)) return
      saveAsk({ ...loadAsk(), last: Date.now(), games: p.stats.played })
      timer = window.setTimeout(() => openFeedback('nudge'), 5000)
    })
    return () => { removeEventListener('fw-feedback', open); off(); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!from) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setFrom(null) }
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [from, busy])

  const close = () => setFrom(null)
  const never = () => { saveAsk({ ...loadAsk(), never: true }); close() }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (message.trim().length < 3) { setError('Write a few words first.'); box.current?.focus(); return }
    setBusy(true); setError('')
    try {
      let screen: string | undefined
      try { screen = JSON.parse(localStorage.getItem('fw-game:screen') ?? 'null') ?? undefined } catch { /* unknown */ }
      await sendFeedback({ name: name.trim() || 'Anonymous', message: message.trim(), screen, version: VERSION })
      setSent(true)
      setTimeout(close, 1800)
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  const display = username ?? (name.trim() || 'You')

  return (
    <AnimatePresence>
      {from && (
        <motion.div className="del-scrim" onClick={() => !busy && close()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form className="del fb" role="dialog" aria-modal="true" aria-labelledby="fb-title" noValidate onSubmit={submit} onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3, ease }}>
            {sent ? (
              <div className="fb-thanks" role="status">
                <Kicko pose="cheer" size={110} />
                <h3>Thanks, {display}!</h3>
                <p className="small dim">Got it. Every message gets read.</p>
              </div>
            ) : (
              <>
                {/* who it's from */}
                <header className="fb-who">
                  <span className="fb-badge" aria-hidden>{(display[0] ?? '?').toUpperCase()}</span>
                  <span className="fb-id">
                    {username || known ? <b>{display}</b> : (
                      <input className="fb-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Your name (optional)" aria-label="Your name" autoComplete="nickname" />
                    )}
                    <small>{username ? `@${username} · version ${VERSION}` : `Playing on this device · version ${VERSION}`}</small>
                  </span>
                  <button type="button" className="coach-x" onClick={close} disabled={busy} aria-label="Close"><X weight="bold" /></button>
                </header>

                {/* what they think */}
                <div className="fb-ask">
                  <h3 id="fb-title">{from === 'nudge' ? 'How is the game going?' : 'Send feedback'}</h3>
                  <p className="small dim">Bugs, ideas, things you love or can't stand. Tell us straight.</p>
                  <textarea ref={box} className="fb-text" value={message} onChange={(e) => { setMessage(e.target.value.slice(0, 2000)); setError('') }}
                    rows={5} placeholder="What's working, what's annoying, what should we add?" aria-label="Your feedback" autoFocus={from !== 'nudge'} />
                  <span className="fb-count small dim num" aria-hidden>{message.length}/2000</span>
                </div>
                {!onlineReady && <p className="small dim">Sending feedback needs the online version of the game.</p>}
                {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}
                <div className="row del-foot">
                  {from === 'nudge' && <button type="button" className="linkish small fb-never" onClick={never}>Don't ask again</button>}
                  <button type="button" className="btn ghost" onClick={close} disabled={busy}>{from === 'nudge' ? 'Not now' : 'Cancel'}</button>
                  <button type="submit" className="btn primary" disabled={busy || !onlineReady} aria-busy={busy}><PaperPlaneTilt weight="bold" /> {busy ? 'Sending…' : 'Send'}</button>
                </div>
              </>
            )}
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
