import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChartLineUp, Fire, LockSimple, Medal, Palette } from '@phosphor-icons/react'
import { ACHIEVEMENTS, levelOf, loadProgress, onProgress, paletteLevel, type Progress } from '../../game/engine/progress'
import { PALETTES } from '../theme/palettes'
import { dayKey, loadDaily, streakOf } from '../../game/engine/daily'

const MODE_NAMES: Record<string, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction', winners: 'Team of Winners' }

export function useProgress() {
  const [p, setP] = useState<Progress>(loadProgress)
  useEffect(() => onProgress((next) => setP(next)), [])
  return p
}

export default function Profile({ name, onInsights }: { name: string; onInsights: () => void }) {
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
          <button className="btn ghost" style={{ justifySelf: 'start' }} onClick={onInsights}><ChartLineUp weight="bold" /> Game insights</button>
        </div>
      </div>
    </div>
  )
}
