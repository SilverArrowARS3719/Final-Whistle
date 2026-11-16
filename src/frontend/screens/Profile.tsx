import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChartLineUp, Compass, Fire, LockSimple, Medal, Palette, Trash } from '@phosphor-icons/react'
import { deleteMyAccount } from '../../backend/auth'
import { forgetThisDevice } from '../../backend/track'
import { openLegal } from './Legal'
import { resetOnboarding } from '../components/Onboarding'
import { ACHIEVEMENTS, levelOf, loadProgress, onProgress, paletteLevel, type Progress } from '../../game/engine/progress'
import { PALETTES } from '../theme/palettes'
import { dayKey, loadDaily, streakOf } from '../../game/engine/daily'

const MODE_NAMES: Record<string, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction', winners: 'Team of Winners' }

export function useProgress() {
  const [p, setP] = useState<Progress>(loadProgress)
  useEffect(() => onProgress((next) => setP(next)), [])
  return p
}

export default function Profile({ name, onInsights, signedIn, onDeleted }: { name: string; onInsights: () => void; signedIn: boolean; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState('')
  const wipe = async () => {
    setDeleting(true); setDelError('')
    try {
      await forgetThisDevice()
      if (signedIn) await deleteMyAccount()
      // everything this game keeps in the browser
      try { Object.keys(localStorage).filter((k) => k.startsWith('fw-')).forEach((k) => localStorage.removeItem(k)) } catch { /* nothing stored */ }
      onDeleted()
    } catch (e) { setDelError((e as Error).message); setDeleting(false) }
  }
  const p = useProgress()
  const lv = levelOf(p.xp)
  const s = p.stats
  const streak = streakOf(loadDaily(), dayKey())
  const nextPalettes = PALETTES.map((x, i) => ({ x, need: paletteLevel(i) })).filter((o) => o.need > lv.level)
  const unlocked = Object.keys(p.achievements).length

  return (
    <div className="profile">
      <div className="screen-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Level {lv.level} · {p.xp.toLocaleString()} XP</span>
          <h2>{name}, {lv.title}.</h2>
          <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={lv.need} aria-valuenow={lv.into} aria-label="XP to next level">
            <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: lv.into / lv.need }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
          </div>
          <span className="small dim"><b className="num">{lv.need - lv.into}</b> XP to level {lv.level + 1}. Win games, play the Daily, unlock achievements.</span>
        </div>
      </div>

      <div className="stat-grid">
        {[
          ['Games', s.played], ['Wins', s.won], ['Win rate', s.played ? `${Math.round((s.won / s.played) * 100)}%` : '–'],
          ['Daily streak', streak], ['Best streak', s.bestStreak], ['Best Daily', s.dailies ? `${s.dailyBest}/9` : '–'],
        ].map(([k, v]) => (
          <div key={k} className="panel pad stat"><span className="label">{k}</span><b className="num">{v}</b></div>
        ))}
      </div>

      <div className="profile-cols">
        <section className="panel pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3><Medal weight="fill" /> Achievements</h3>
            <span className="num dim">{unlocked}/{ACHIEVEMENTS.length}</span>
          </div>
          <div className="ach-grid">
            {ACHIEVEMENTS.map((a) => {
              const got = p.achievements[a.id]
              return (
                <div key={a.id} className={`ach ${got ? 'on' : ''}`} title={got ? `Unlocked ${new Date(got).toLocaleDateString()}` : 'Locked'}>
                  {got ? <Medal weight="fill" /> : <LockSimple weight="bold" />}
                  <b>{a.name}</b>
                  <span>{a.desc}</span>
                  <em className="num">+{a.xp} XP</em>
                </div>
              )
            })}
          </div>
        </section>
        <div className="stack">
          <section className="panel pad stack">
            <h3><Fire weight="fill" /> By mode</h3>
            <table className="table mini-table">
              <thead><tr><th>Mode</th><th>Played</th><th>Won</th></tr></thead>
              <tbody>
                {Object.entries(MODE_NAMES).map(([m, n]) => (
                  <tr key={m}><td>{n}</td><td className="num">{s.byMode[m as keyof typeof s.byMode]?.played ?? 0}</td><td className="num">{s.byMode[m as keyof typeof s.byMode]?.won ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel pad stack">
            <h3><Palette weight="fill" /> Colour unlocks</h3>
            {nextPalettes.length === 0
              ? <p className="small dim">Every palette is yours. Open Settings, then Colours.</p>
              : (
                <div className="stack" style={{ gap: 8 }}>
                  {nextPalettes.slice(0, 4).map(({ x, need }) => (
                    <div key={x.id} className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="row" style={{ gap: 8 }}><span className="lab-dots">{x.colors.map((c) => <u key={c.name} style={{ background: c.hex }} />)}</span>{x.name}</span>
                      <span className="small dim num">Level {need}</span>
                    </div>
                  ))}
                  {nextPalettes.length > 4 && <span className="small dim">and {nextPalettes.length - 4} more.</span>}
                </div>
              )}
          </section>
          <div className="row"><button className="btn ghost" onClick={() => { resetOnboarding(); location.reload() }}><Compass weight="bold" /> Replay the tour</button><button className="btn ghost" onClick={onInsights}><ChartLineUp weight="bold" /> Game insights</button></div>
          <section className="panel pad stack danger-zone">
            <h3><Trash weight="bold" /> Delete my data</h3>
            <p className="small dim">{signedIn
              ? 'Deletes your account, username, friends, league places, results and usage stats from our servers, and everything saved on this device. This can\'t be undone.'
              : 'Deletes everything saved on this device (profile, XP, saved games, Daily Draft history) and any anonymous usage stats from this browser. This can\'t be undone.'}</p>
            {!confirming
              ? <button className="btn" style={{ justifySelf: 'start' }} onClick={() => setConfirming(true)}>Delete my data</button>
              : (
                <div className="row">
                  <button className="btn danger" onClick={wipe} disabled={deleting} autoFocus>{deleting ? <span className="spin" aria-hidden /> : <Trash weight="bold" />} Yes, delete everything</button>
                  <button className="btn ghost" onClick={() => setConfirming(false)} disabled={deleting}>Keep my data</button>
                </div>
              )}
            {delError && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{delError}</p>}
            <p className="small"><button className="linkish" onClick={() => openLegal('Privacy')}>Privacy policy</button> · <button className="linkish" onClick={() => openLegal('Terms')}>Terms</button></p>
          </section>
        </div>
      </div>
    </div>
  )
}
