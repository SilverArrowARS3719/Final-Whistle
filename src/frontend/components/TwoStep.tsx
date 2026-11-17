import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, ShieldCheck } from '@phosphor-icons/react'
import { CODE_RULE, startTwoStep, stopTwoStep, twoStepFactor, verifyCode } from '../../backend/auth'

type Setup = { factorId: string; qr: string; secret: string }

/** Profile section: turn two-step login (password + a 6-digit code from an authenticator app) on or off. */
export default function TwoStep() {
  const [factor, setFactor] = useState<string | null | undefined>(undefined) // undefined while loading
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { twoStepFactor().then(setFactor, () => setFactor(null)) }, [])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const begin = () => run(async () => { setSetup(await startTwoStep()); setCode('') })
  const cancel = () => { if (setup) stopTwoStep(setup.factorId).catch(() => {}); setSetup(null); setError('') }
  const finish = (e: FormEvent) => {
    e.preventDefault()
    if (!setup) return
    if (!CODE_RULE.test(code)) return setError('Enter the 6-digit code your app shows.')
    run(async () => { await verifyCode(setup.factorId, code); setFactor(setup.factorId); setSetup(null) })
  }
  const turnOff = () => {
    if (!factor || !window.confirm('Turn off two-step login? Anyone with your password could then sign in.')) return
    run(async () => { await stopTwoStep(factor); setFactor(null) })
  }
  const copy = () => { navigator.clipboard?.writeText(setup?.secret ?? '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }, () => {}) }

  return (
    <section aria-labelledby="pf-2fa" className="two-step">
      <div className="pf-head"><h3 id="pf-2fa">Two-step login</h3>{factor && <span className="small accent"><Check weight="bold" /> On</span>}</div>
      {factor === undefined ? <p className="small dim">Checking…</p>
        : factor ? (
          <div className="stack" style={{ gap: 12 }}>
            <p className="small dim">After your password, we ask for the 6-digit code from your authenticator app. A stolen password alone can't get in.</p>
            <div><button className="btn ghost sm" onClick={turnOff} disabled={busy}>Turn off</button></div>
          </div>
        ) : setup ? (
          <form className="stack" style={{ gap: 14 }} onSubmit={finish} noValidate>
            <p className="small">1. Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</p>
            <img className="two-step-qr" src={setup.qr} alt="QR code for your authenticator app" width={168} height={168} />
            <p className="small dim">Can't scan? Type this key into the app instead:</p>
            <div className="two-step-key">
              <code className="num">{setup.secret}</code>
              <button type="button" className="btn ghost sm" onClick={copy} aria-label="Copy the key">{copied ? <Check weight="bold" /> : <Copy weight="bold" />}</button>
            </div>
            <label className="small" htmlFor="two-step-code">2. Enter the 6-digit code the app shows</label>
            <input id="two-step-code" className="code-input" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
            <div className="row" style={{ gap: 10 }}>
              <button type="submit" className="btn primary sm" disabled={busy}>Turn on</button>
              <button type="button" className="btn ghost sm" onClick={cancel} disabled={busy}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            <p className="small dim">Add a 6-digit code from your phone to every login, so a stolen password isn't enough.</p>
            <div><button className="btn sm" onClick={begin} disabled={busy}><ShieldCheck weight="bold" /> Turn on</button></div>
          </div>
        )}
      {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}
    </section>
  )
}
