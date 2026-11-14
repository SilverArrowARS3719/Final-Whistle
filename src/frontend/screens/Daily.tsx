import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Copy, Fire, Link, Play, ShareNetwork, Trophy } from '@phosphor-icons/react'
import { PLAYERS, surname, type Player } from '../../game/data/players'
import { FORMATIONS } from '../../game/data/formations'
import Pitch from '../components/Pitch'
import { Confetti } from '../components/Atmosphere'
import PlayerCard from '../components/PlayerCard'
import {
  addDays, bestRating, dailyFor, dailyTeam, dayKey, loadDaily, OPP_LABELS, playDaily, playDailyMatch, saveDay, shareText, streakOf, type Outcome,
} from '../../game/engine/daily'
import { effectiveOvr } from '../../game/engine/position'
import { record } from '../../game/engine/progress'
import { sfx } from '../../game/engine/sfx'
import type { Account } from '../../backend/auth'
import { dailyBoard, submitDaily, type BoardRow } from '../../backend/dailyBoard'
import { track } from '../../backend/track'
import Match from './Match'

const OUTCOME: Record<Outcome, { label: string; cls: string }> = {
  W: { label: 'Won', cls: 'w' }, WP: { label: 'Won on pens', cls: 'wp' }, LP: { label: 'Lost on pens', cls: 'lp' }, L: { label: 'Lost', cls: 'l' },
}
const ease = [0.16, 1, 0.3, 1] as const

function useUntilMidnight() {
  const calc = () => { const n = new Date(); const m = new Date(n); m.setHours(24, 0, 0, 0); return m.getTime() - n.getTime() }
  const [ms, setMs] = useState(calc)
  useEffect(() => { const id = setInterval(() => setMs(calc()), 30_000); return () => clearInterval(id) }, [])
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export default function Daily({ account }: { account: Account | null }) {
  const key = dayKey()
  const d = dailyFor(key)
  const [history, setHistory] = useState(loadDaily)
  const rec = history[key] ?? { picks: [] }
  const [started, setStarted] = useState(rec.picks.length > 0)
  const [eyeing, setEyeing] = useState<Player | null>(null) // the option under the pointer: its links preview on the pitch
  const picks = rec.picks.map((id) => PLAYERS[id])
  const round = picks.length
  const slots = FORMATIONS[d.formation]
  const streak = streakOf(history, key)

  const team = useMemo(() => {
    const t = dailyTeam(d, [])
    t.picks = slots.map((_, i) => picks[i] ?? null)
    return t
  }, [d, picks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (p: Player) => {
    // a card still fading out from the last round (or a double tap) must not count for this one
    if (rec.result || !d.rounds[round]?.some((o) => o.id === p.id)) return
    setEyeing(null)
    sfx.pick()
    const next = [...rec.picks, p.id]
    if (next.length < 11) { setHistory(saveDay(key, { picks: next })); return }
    const result = playDaily(d, next.map((id) => PLAYERS[id]))
    const all = saveDay(key, { picks: next, result })
    setHistory(all)
    const s = streakOf(all, key)
    record({ kind: 'daily', points: result.points, streak: s })
    track('daily_done', { number: d.number, points: result.points, rating: result.rating, streak: s })
    if (account) submitDaily(key, result).catch(() => {})
  }

  if (rec.result) return <DailyResult account={account} history={history} />

  if (!started)
    return (
      <div className="daily">
        <div className="screen-head">
          <div className="stack" style={{ gap: 8 }}>
            <span className="label">Daily Draft #{d.number} · same puzzle for everyone today</span>
            <h2>Eleven picks. Three matches.</h2>
            <span className="dim">Each round you get three players for one slot. Then your XI takes on three legends sides, each tougher than the last. You get one go a day.</span>
          </div>
          <button className="btn primary lg" onClick={() => { setStarted(true); track('daily_start', { number: d.number }) }}>Start today's draft <ArrowRight weight="bold" /></button>
        </div>
        <div className="daily-intro">
          <div className="panel pad stack">
            <span className="label">Today's rule</span>
            <h3>{d.rule.name}</h3>
            <p className="dim">{d.rule.desc}</p>
            <span className="label">Formation</span>
            <h3 className="num">{d.formation}</h3>
            {streak > 0 && <p className="streak-line"><Fire weight="fill" /> {streak}-day streak. Play today to keep it.</p>}
          </div>
          <div className="panel pad stack">
            <span className="label">You'll face</span>
            {d.opponents.map((o, i) => (
              <div key={o.name} className="opp-row">
                <span className="opp-step num">{i + 1}</span>
                <div><b>{o.name}</b><span className="small dim">{OPP_LABELS[i]} · {o.picks.slice(8).map((p) => p!.name).join(', ')}</span></div>
              </div>
            ))}
            <p className="small dim">Points: 3 for a win, 2 for a win on penalties, 1 for a penalty defeat. 9 is perfect.</p>
          </div>
        </div>
      </div>
    )

  const pos = slots[round].pos
  const linksOf = (p: Player) => picks.filter((m) => m.nation === p.nation || m.clubs.some((c) => p.clubs.includes(c)))
  return (
    <div className="daily">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Daily Draft #{d.number} · {d.rule.name} · round {round + 1} of 11</span>
          <h2>Pick your {pos}.</h2>
        </div>
        <div className="daily-dots" aria-label={`${round} of 11 picked`}>
          {slots.map((_, i) => <span key={i} className={i < round ? 'done' : i === round ? 'on' : ''} />)}
        </div>
      </div>
      <div className="daily-pick">
        <AnimatePresence mode="wait">
          <motion.div key={round} className="daily-options" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease }}>
            {d.rounds[round].map((p, k) => {
              const links = linksOf(p)
              return (
                <motion.button key={p.id} className="daily-option" onClick={() => choose(p)} onPointerEnter={() => setEyeing(p)} onPointerLeave={() => setEyeing(null)} onFocus={() => setEyeing(p)} onBlur={() => setEyeing(null)} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.07, duration: 0.4, ease }}>
                  <PlayerCard p={p} ovr={effectiveOvr(p, pos)} tilt={false} />
                  <span className="daily-links small">
                    {links.length > 0 && <><Link weight="bold" /> Links with {links.map((l) => surname(l.name)).join(', ')}</>}
                  </span>
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>
        <div className="daily-pitch">
          <Pitch team={team} active={round} ghost={eyeing} compact footer={false} />
          <p className="link-key"><span><i />no link</span><span><i className="on" />same league or era</span><span><i className="strong" />same club or country</span></p>
        </div>
      </div>
    </div>
  )
}

function DailyResult({ account, history }: { account: Account | null; history: ReturnType<typeof loadDaily> }) {
  const key = dayKey()
  const d = dailyFor(key)
  const rec = history[key]
  const r = rec.result!
  const picks = rec.picks.map((id) => PLAYERS[id])
  const team = useMemo(() => dailyTeam(d, picks), [d]) // eslint-disable-line react-hooks/exhaustive-deps
  const streak = streakOf(history, key)
  const best = useMemo(() => bestRating(d), [d])
  const until = useUntilMidnight()
  const [watch, setWatch] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [board, setBoard] = useState<BoardRow[] | null>(null)
  useEffect(() => { if (account) dailyBoard(key).then(setBoard).catch(() => setBoard(null)) }, [account, key])

  if (watch !== null)
    return (
      <div className="stack">
        <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => setWatch(null)}><ArrowLeft weight="bold" /> Back to today's result</button>
        <Match result={playDailyMatch(d, team, watch)} teams={[team, d.opponents[watch]]} seats={[0, 1]} kicker={`Daily #${d.number} · ${OPP_LABELS[watch]}`} onFinish={() => setWatch(null)} />
      </div>
    )

  const text = shareText(d, r, streak)
  const canShare = typeof navigator.share === 'function'
  const share = async () => {
    record({ kind: 'share' })
    track('share', { what: 'daily' })
    try {
      if (canShare) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600) }
    } catch { /* share sheet closed */ }
  }
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(key, i - 13))

  return (
    <div className="daily">
      {r.points >= 6 && <Confetti />}
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Daily Draft #{d.number} · {d.rule.name}</span>
          <h2 className="daily-score"><b className="num">{r.points}</b>/9</h2>
          <span className="dim">XI rating <b className="num">{r.rating}</b> · best possible today <b className="num">{best}</b></span>
        </div>
        <div className="stack" style={{ gap: 10, justifyItems: 'end' }}>
          <button className="btn primary lg" onClick={share}>{copied ? <><Check weight="bold" /> Copied</> : canShare ? <><ShareNetwork weight="bold" /> Share</> : <><Copy weight="bold" /> Copy result</>}</button>
          <span className="small dim"><CalendarCheck weight="bold" /> Next Daily in <b className="num">{until}</b></span>
        </div>
      </div>

      <div className="daily-results">
        {d.opponents.map((o, i) => {
          const out = OUTCOME[r.outcomes[i]]
          return (
            <motion.div key={o.name} className={`panel pad daily-match ${out.cls}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.25, duration: 0.5, ease }}>
              <span className="label">{OPP_LABELS[i]}</span>
              <b className="daily-opp">{o.name}</b>
              <span className="daily-sc num">{r.scores[i][0]}–{r.scores[i][1]}{r.pens[i] && <small> ({r.pens[i]![0]}–{r.pens[i]![1]} pens)</small>}</span>
              <span className={`outcome ${out.cls}`}>{out.label}</span>
              <button className="btn ghost sm" onClick={() => setWatch(i)}><Play weight="fill" /> Watch</button>
            </motion.div>
          )
        })}
      </div>

      <div className="daily-intro" style={{ marginTop: 24 }}>
        <div className="panel pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Your streak</span>
            <span className="streak-line"><Fire weight="fill" /> <b className="num">{streak}</b> day{streak === 1 ? '' : 's'}</span>
          </div>
          <div className="cal" aria-label="Last 14 days">
            {last14.map((k) => {
              const res = history[k]?.result
              return <span key={k} className={`cal-day ${res ? 'on' : ''} ${k === key ? 'today' : ''}`} title={`${k}${res ? `: ${res.points}/9` : ''}`}>{res ? res.points : ''}</span>
            })}
          </div>
          <pre className="share-preview">{text}</pre>
        </div>
        <div className="panel pad stack">
          <span className="label"><Trophy weight="bold" /> Today's table</span>
          {!account && <p className="small dim">Sign in to play online and your score goes on the table with everyone else's.</p>}
          {account && !board && <div className="skeleton-list"><span /><span /><span /></div>}
          {board && board.length === 0 && <p className="small dim">You're the first today.</p>}
          {board && board.length > 0 && (
            <table className="table mini-table">
              <thead><tr><th>#</th><th>Player</th><th>Pts</th><th>GD</th><th>XI</th></tr></thead>
              <tbody>
                {board.slice(0, 12).map((b, i) => (
                  <tr key={b.username} className={b.me ? 'lead' : ''}><td>{i + 1}</td><td>@{b.username}{b.friend && <span className="small dim"> · friend</span>}</td><td><b>{b.points}</b></td><td>{b.gd > 0 ? '+' : ''}{b.gd}</td><td className="num">{b.rating}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="daily-xi">
        <span className="label">Your XI today</span>
        <Pitch team={team} compact footer={false} />
      </div>
    </div>
  )
}
