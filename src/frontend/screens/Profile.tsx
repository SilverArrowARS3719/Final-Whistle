import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ChartLineUp, Check, Compass, GearSix, LockSimple, Medal, Trash, Warning, X } from '@phosphor-icons/react'
import { deleteMyAccount } from '../../backend/auth'
import { forgetThisDevice } from '../../backend/track'
import { resetConsent } from '../../backend/consent'
import { openLegal } from './Legal'
import { resetOnboarding } from '../components/Onboarding'
import { resetTips } from '../components/Coach'
import { openSettings } from '../components/QuickSettings'
import { ACHIEVEMENTS, levelOf, loadProgress, onProgress, paletteLevel, TITLES, type Progress } from '../../game/engine/progress'
import { PALETTES } from '../theme/palettes'
import { dayKey, loadDaily, streakOf } from '../../game/engine/daily'

const MODES: [string, string][] = [['xi', 'All-Time XI'], ['sot', 'Stick or Twist'], ['chaos', 'Chaos Draft'], ['auction', 'Auction'], ['winners', 'Team of Winners']]
const ease = [0.16, 1, 0.3, 1] as const

export function useProgress() {
  const [p, setP] = useState<Progress>(loadProgress)
  useEffect(() => onProgress((next) => setP(next)), [])
  return p
}

type Props = { name: string; onInsights: () => void; signedIn: boolean; onDeleted: () => void }

export default function Profile({ name, onInsights, signedIn, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)
  const p = useProgress()
  const lv = levelOf(p.xp)
  const s = p.stats
  const streak = streakOf(loadDaily(), dayKey())
  const nextTitle = TITLES[lv.level] // the title one level up, if there is one
  const nextPalettes = PALETTES.map((x, i) => ({ x, need: paletteLevel(i) })).filter((o) => o.need > lv.level)
  const unlocked = ACHIEVEMENTS.filter((a) => p.achievements[a.id])
  const locked = ACHIEVEMENTS.filter((a) => !p.achievements[a.id])
  const pct = (won: number, played: number) => (played ? Math.round((won / played) * 100) : 0)

  const strip: [string, string | number][] = [
    ['Played', s.played], ['Won', s.won], ['Win rate', s.played ? `${pct(s.won, s.played)}%` : '–'],
    ['Daily streak', streak], ['Best Daily', s.dailies ? `${s.dailyBest}/9` : '–'],
  ]

  return (
    <div className="profile2">
      {/* the header is a matchday graphic: photo, shirt-number badge, name, then the numbers on one strip */}
      <header className="pf-hero">
        <img className="pf-hero-photo" src="/img/winners.jpg" alt="" />
        <div className="pf-hero-shade" aria-hidden />
        <div className="pf-id">
          <motion.span className="pf-badge" aria-hidden initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease }}>
            {name[0]?.toUpperCase()}
            <small className="num">{String(lv.level).padStart(2, '0')}</small>
          </motion.span>
          <div className="pf-name">
            <span className="pf-kicker num">LEVEL {lv.level} · {lv.title.toUpperCase()}</span>
            <h2>{name}</h2>
            <div className="pf-xp">
              <div className="pf-xp-rail" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label="XP to next level">
                <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: lv.into / lv.need }} transition={{ duration: 0.9, ease, delay: 0.15 }} />
              </div>
              <span className="small"><b className="num">{lv.need - lv.into}</b> XP to {nextTitle ? <b>{nextTitle}</b> : `level ${lv.level + 1}`} · <span className="num">{p.xp.toLocaleString()}</span> XP total</span>
            </div>
          </div>
        </div>
        <dl className="pf-strip">
          {strip.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
        </dl>
      </header>

      <div className="pf-cols">
        <section className="pf-cabinet" aria-labelledby="pf-cab">
          <div className="pf-head"><h3 id="pf-cab">Trophy cabinet</h3><span className="num dim">{unlocked.length} of {ACHIEVEMENTS.length}</span></div>
          {unlocked.length === 0 && <p className="small dim">Empty for now. Finish your first game and the first one goes in.</p>}
          {unlocked.length > 0 && (
            <ul className="pf-won">
              {unlocked.map((a) => (
                <li key={a.id} title={`Won ${new Date(p.achievements[a.id]).toLocaleDateString()}`}>
                  <Medal weight="fill" /><b>{a.name}</b><span>{a.desc}</span>
                </li>
              ))}
            </ul>
          )}
          <h4 className="pf-sub">Still to win</h4>
          <ul className="pf-locked">
            {locked.map((a) => <li key={a.id}><LockSimple weight="bold" /><span><b>{a.name}</b> {a.desc}</span><em className="num">+{a.xp}</em></li>)}
          </ul>
        </section>

        <div className="pf-side">
          <section aria-labelledby="pf-modes">
            <div className="pf-head"><h3 id="pf-modes">Record by mode</h3></div>
            <ul className="pf-modes">
              {MODES.map(([m, label]) => {
                const r = s.byMode[m as keyof typeof s.byMode]
                const played = r?.played ?? 0, won = r?.won ?? 0
                return (
                  <li key={m}>
                    <img src={`/img/${m}.jpg`} alt="" />
                    <span className="pf-mode-name"><b>{label}</b><span className="num">{played} played · {won} won</span></span>
                    <span className="pf-rate num" style={{ ['--w' as string]: `${pct(won, played)}%` }}>{played ? `${pct(won, played)}%` : '–'}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          {nextPalettes.length > 0 && (
            <section aria-labelledby="pf-next">
              <div className="pf-head"><h3 id="pf-next">Next unlock</h3><span className="small dim">Level {nextPalettes[0].need}</span></div>
              <button className="pf-unlock" onClick={() => openSettings('Colours')}>
                <span className="lab-dots">{nextPalettes[0].x.colors.map((c) => <u key={c.name} style={{ background: c.hex }} />)}</span>
                <span><b>{nextPalettes[0].x.name}</b> colour theme{nextPalettes.length > 1 && <span className="dim">, then {nextPalettes.length - 1} more</span>}</span>
                <ArrowRight weight="bold" />
              </button>
            </section>
          )}

          <nav className="pf-links" aria-label="More">
            <button onClick={() => openSettings()}><GearSix weight="bold" /> Settings</button>
            <button onClick={() => { resetOnboarding(); resetTips(); location.reload() }}><Compass weight="bold" /> Replay the onboarding</button>
            <button onClick={onInsights}><ChartLineUp weight="bold" /> Game insights</button>
          </nav>
        </div>
      </div>

      <section className="pf-danger" aria-labelledby="pf-del">
        <div>
          <h3 id="pf-del">Delete my data</h3>
          <p className="small dim">{signedIn ? 'Your account and everything in it, on our servers and on this device.' : 'Everything this game has saved on this device.'} This can't be undone.</p>
        </div>
        <button className="btn danger-outline" onClick={() => setDeleting(true)}><Trash weight="bold" /> Delete everything</button>
      </section>

      {/* portalled: the page transition's transform on <main> would otherwise trap position: fixed */}
      {createPortal(<AnimatePresence>{deleting && <DeleteDialog name={name} signedIn={signedIn} onClose={() => setDeleting(false)} onDeleted={onDeleted} />}</AnimatePresence>, document.body)}
    </div>
  )
}

/**
 * GitHub-style: to delete, type your whole username three times. Slow on purpose, so nobody loses
 * a year of leagues to a misclick.
 */
function DeleteDialog({ name, signedIn, onClose, onDeleted }: { name: string; signedIn: boolean; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState(['', '', ''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const first = useRef<HTMLInputElement>(null)
  const ok = typed.map((t) => t === name)
  const ready = ok.every(Boolean)

  useEffect(() => {
    first.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [busy, onClose])

  const wipe = async () => {
    if (!ready) return
    setBusy(true); setError('')
    try {
      await forgetThisDevice()
      if (signedIn) await deleteMyAccount()
      // everything this game keeps in the browser
      try { Object.keys(localStorage).filter((k) => k.startsWith('fw-')).forEach((k) => localStorage.removeItem(k)) } catch { /* nothing stored */ }
      resetConsent() // and the cookie
      onDeleted()
    } catch (e) { setError((e as Error).message); setBusy(false) }
  }

  const gone = signedIn
    ? ['Your account, email and username', 'Friends, requests and game invites', 'Your league places and every result', 'Daily Draft scores and usage stats', 'XP, achievements and saved games on this device']
    : ['Your name, XP and achievements', 'Saved games and Daily Draft history', 'Settings, colours and anonymous usage stats']

  return (
    <motion.div className="del-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()}>
      <motion.form className="del" role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-what"
        onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); wipe() }}
        initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25, ease }}>
        <header>
          <h3 id="del-title">Delete everything?</h3>
          <button type="button" className="coach-x" onClick={onClose} disabled={busy} aria-label="Cancel"><X weight="bold" /></button>
        </header>
        <p className="del-warn"><Warning weight="fill" /> This is permanent. We can't bring any of it back.</p>
        <div id="del-what">
          <span className="label">What goes</span>
          <ul>{gone.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        <fieldset disabled={busy}>
          <legend>To confirm, type <b className="num">{name}</b> in all three boxes.</legend>
          {typed.map((t, i) => (
            <label key={i} className={`del-input ${ok[i] ? 'ok' : t && !name.startsWith(t) ? 'bad' : ''}`}>
              <span className="num">{i + 1}</span>
              <input ref={i === 0 ? first : undefined} value={t} onChange={(e) => setTyped(typed.map((x, j) => (j === i ? e.target.value : x)))}
                autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label={`Username, ${['first', 'second', 'third'][i]} time`} />
              {ok[i] && <Check weight="bold" aria-hidden />}
            </label>
          ))}
        </fieldset>
        {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}
        <div className="row del-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Keep my data</button>
          <button type="submit" className="btn danger" disabled={!ready || busy} aria-busy={busy}><Trash weight="bold" /> {busy ? 'Deleting…' : 'Delete everything'}</button>
        </div>
        <p className="small dim">Want a copy first? Email us and we'll send it. <button type="button" className="linkish" onClick={() => openLegal('Privacy')}>Privacy policy</button></p>
      </motion.form>
    </motion.div>
  )
}
