import { sfx } from '../engine/sfx'
import ShareResult from '../components/ShareResult'
import type { ResultCard } from '../engine/shareCard'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, ArrowsLeftRight, CheckCircle, FastForward, SoccerBall, WarningCircle, X } from '@phosphor-icons/react'
import { MATCH_PLAYBACK_MS } from '../engine/config'
import { statsAt, type MatchEvent, type MatchResult } from '../engine/sim'
import Seg from '../components/Seg'
import MatchTV from '../components/MatchTV'
import { HostOnly } from '../online/context'
import { analyse } from '../engine/analysis'
import type { Team } from '../engine/draft'

const TABS = ['Stats', 'Ratings', 'Fitness', 'Gameplan', 'Analysis'] as const

function Icon({ e }: { e: MatchEvent }) {
  if (e.type === 'goal') return <SoccerBall weight="fill" color="var(--accent)" />
  if (e.type === 'yellow') return <span className="card-ico y" aria-label="Yellow card" />
  if (e.type === 'red') return <span className="card-ico r" aria-label="Red card" />
  if (e.type === 'sub') return <ArrowsLeftRight color="var(--dim)" />
  if (e.type === 'pen') return e.scored ? <SoccerBall weight="fill" color="var(--accent)" /> : <X color="var(--hot)" weight="bold" />
  return null
}

function Digit({ v }: { v: number }) {
  return (
    <span className="digit">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={v}
          style={{ display: 'inline-block' }}
          initial={{ y: '-100%', rotateX: 90, opacity: 0 }}
          animate={{ y: 0, rotateX: 0, opacity: 1 }}
          exit={{ y: '100%', rotateX: -90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          {v}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// Each player seat (1-4) always gets the same celebration, so you know who scored without reading.
const CELEBRATIONS = [
  { initial: { clipPath: 'inset(0 100% 0 0)' }, animate: { clipPath: 'inset(0 0% 0 0)' }, exit: { clipPath: 'inset(0 0 0 100%)' }, transition: { duration: 0.4, ease: [0.7, 0, 0.3, 1] as const } },
  { initial: { clipPath: 'circle(0% at 50% 50%)' }, animate: { clipPath: 'circle(75% at 50% 50%)' }, exit: { opacity: 0, scale: 1.08 }, transition: { duration: 0.45, ease: [0.7, 0, 0.3, 1] as const } },
  { initial: { clipPath: 'inset(0 0 100% 0)' }, animate: { clipPath: 'inset(0 0 0% 0)' }, exit: { clipPath: 'inset(100% 0 0 0)' }, transition: { duration: 0.4, ease: [0.7, 0, 0.3, 1] as const } },
  { initial: { scale: 0.3, rotate: -8, opacity: 0 }, animate: { scale: 1, rotate: 0, opacity: 1 }, exit: { scale: 1.3, opacity: 0 }, transition: { type: 'spring' as const, stiffness: 260, damping: 14 } },
]

export function matchCard(result: MatchResult, kicker: string): ResultCard {
  const [na, nb] = result.names
  const goals = (side: 0 | 1) => result.events.filter((e) => e.type === 'goal' && e.side === side).map((e) => `${e.text.replace(/^GOAL! /, '').replace(/ \d+-\d+$/, '')} ${e.clock}`)
  const best = result.snapshots.at(-1)!.flatMap((side) => side).filter((l) => !l.off).sort((a, b) => b.rating - a.rating)[0]
  return {
    kicker,
    rows: [{ name: na, value: String(result.score[0]), win: result.winner === 0 }, { name: nb, value: String(result.score[1]), win: result.winner === 1 }],
    note: result.pens ? `${result.names[result.winner]} win ${Math.max(...result.pens)}-${Math.min(...result.pens)} on penalties` : result.wentToET ? 'After extra time' : undefined,
    lists: [{ title: `${na} goals`, items: goals(0).length ? goals(0) : ['None'] }, { title: `${nb} goals`, items: goals(1).length ? goals(1) : ['None'] }],
    star: best && `Player of the match: ${best.name} ${best.rating.toFixed(1)}`,
  }
}

export default function Match({ result, teams, seats, kicker, onFinish }: { result: MatchResult; teams: [Team, Team]; seats: [number, number]; kicker: string; onFinish: () => void }) {
  const last = result.labels.length - 1
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Stats')
  const [flash, setFlash] = useState<MatchEvent | null>(null)

  useEffect(() => {
    if (step >= last) return
    const id = setTimeout(() => setStep((s) => s + 1), MATCH_PLAYBACK_MS / last)
    return () => clearTimeout(id)
  }, [step, last])

  useEffect(() => {
    const g = result.events.find((e) => e.type === 'goal' && e.step === step)
    if (g) { setFlash(g); sfx.goal() }
    if (step === 0) sfx.whistle()
    if (step === last) sfx.whistle(true)
  }, [step, result.events, last])

  // own effect so the next clock tick doesn't cancel the hide timer
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 1300)
    return () => clearTimeout(id)
  }, [flash])

  const reports = useMemo(() => analyse(result, teams), [result, teams])
  // jump to the tactical report when the final whistle goes
  useEffect(() => { if (step >= last) setTab('Analysis') }, [step, last])

  const st = statsAt(result, step)
  const shown = result.events.filter((e) => e.step <= step && e.type !== 'shot').reverse()
  const [snapA, snapB] = result.snapshots[step]
  const done = step >= last
  const [na, nb] = result.names
  const pensStep = result.labels.indexOf('PENS')
  const scorer = (e: MatchEvent) => e.text.replace(/^GOAL! /, '').replace(/ \d+-\d+$/, '')

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="panel board">
        <AnimatePresence>
          {flash && (
            <motion.div
              key={flash.step}
              className={`goal-flash cel-${seats[flash.side as 0 | 1] % 4}`}
              {...CELEBRATIONS[seats[flash.side as 0 | 1] % 4]}
            >
              <div>
                <div className="g">Goal</div>
                <div style={{ fontWeight: 700 }}>{scorer(flash)} · {flash.side === 0 ? na : nb}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="team">
          <div className="tname">{na}</div>
          <div className="kv">
            <div><span className="label">Possession</span><b>{st.poss[0]}%</b></div>
            <div><span className="label">Shots</span><b>{st.a.shots}</b></div>
            <div><span className="label">Big chances</span><b>{st.a.chances}</b></div>
          </div>
        </div>
        <div className="scorebox">
          <div className="digits"><Digit v={st.a.goals} /><span className="dim">:</span><Digit v={st.b.goals} /></div>
          {result.pens && step >= pensStep && <div className="num small">Pens {st.a.pens}-{st.b.pens}</div>}
          <div className="clock">{done ? 'Full time' : result.labels[step]}</div>
        </div>
        <div className="team r">
          <div className="tname">{nb}</div>
          <div className="kv">
            <div><span className="label">Big chances</span><b>{st.b.chances}</b></div>
            <div><span className="label">Shots</span><b>{st.b.shots}</b></div>
            <div><span className="label">Possession</span><b>{st.poss[1]}%</b></div>
          </div>
        </div>
        <div className="poss-bar" aria-hidden><motion.span animate={{ width: `${st.poss[0]}%` }} transition={{ duration: 0.4 }} /></div>
      </div>

      <MatchTV result={result} step={step} score={[st.a.goals, st.b.goals]} />

      <AnimatePresence>
        {done && (
          <motion.div
            className="row"
            style={{ justifyContent: 'space-between' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="accent">
              {result.names[result.winner]} win{result.pens ? ' on penalties' : result.wentToET ? ' after extra time' : ''}
            </h3>
            <div className="row" style={{ gap: 10 }}>
              <ShareResult card={matchCard(result, kicker)} />
              <HostOnly><button className="btn primary lg" onClick={onFinish}>Continue <ArrowRight weight="bold" /></button></HostOnly>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="split">
        <div className="panel timeline" aria-live="polite">
          <AnimatePresence initial={false}>
            {shown.map((e) => (
              <motion.div
                key={`${e.step}-${e.text}`}
                className={`ev ${e.type}`}
                initial={{ opacity: 0, x: e.side === 1 ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              >
                <span className="m">{e.clock}</span>
                <span style={{ display: 'grid', placeItems: 'center' }}><Icon e={e} /></span>
                <span>
                  {e.text}
                  {e.side >= 0 && <span className="who">{e.side === 0 ? na : nb}</span>}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="tabs"><Seg id="match-tab" options={[...TABS]} value={tab} onChange={setTab} /></div>
          {tab === 'Stats' && (
            <div className="stats-grid">
              {([
                ['Possession', st.poss[0], st.poss[1], '%'],
                ['Shots', st.a.shots, st.b.shots, ''],
                ['On target', st.a.onTarget, st.b.onTarget, ''],
                ['Big chances', st.a.chances, st.b.chances, ''],
                ['Yellow cards', st.a.yellows, st.b.yellows, ''],
                ['Red cards', st.a.reds, st.b.reds, ''],
              ] as const).map(([l, a, b, u]) => (
                <div key={l} className="stat-row">
                  <b>{a}{u}</b>
                  <div>
                    <div className="lbl">{l}</div>
                    <div className="bars">
                      {a + b > 0 && <>
                        <motion.span style={{ background: 'var(--accent)' }} animate={{ flexGrow: a }} />
                        <motion.span style={{ background: 'var(--chalk)', opacity: 0.5 }} animate={{ flexGrow: b }} />
                      </>}
                    </div>
                  </div>
                  <b>{b}{u}</b>
                </div>
              ))}
            </div>
          )}
          {(tab === 'Fitness' || tab === 'Ratings') && (
            <div className="lineups">
              {[snapA, snapB].map((lines, s) => (
                <div key={s} className="lu">
                  <h3 style={{ marginBottom: 6 }}>{result.names[s]}</h3>
                  {lines.map((l, i) => (
                    <div key={i} className={l.off ? 'out' : ''} title={tab === 'Ratings' ? (reports[s].notes[l.name] ?? []).join(', ') : undefined}>
                      <span className="p">{l.pos}</span>
                      <span className="n">{l.name}</span>
                      {tab === 'Fitness' ? (
                        <span className="fit"><span style={{ width: `${l.fit}%`, background: l.fit < 60 ? 'var(--hot)' : undefined }} /></span>
                      ) : (
                        <span className="rating" style={{ color: l.rating >= 7.5 ? 'var(--accent)' : l.rating < 6 ? 'var(--hot)' : undefined }}>{l.rating.toFixed(1)}</span>
                      )}
                      {tab === 'Ratings' && reports[s].notes[l.name] && <span className="note">{reports[s].notes[l.name].join(' · ')}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {tab === 'Analysis' && (
            done ? (
              <div className="analysis">
                {reports.map((r, s) => (
                  <div key={s}>
                    <h3>{result.names[s]}</h3>
                    {r.insights.map((ins, k) => (
                      <motion.div key={k} className="insight" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.06 }}>
                        {ins.good ? <CheckCircle weight="fill" color="var(--accent)" /> : <WarningCircle weight="fill" color="var(--hot)" />}
                        <span>{ins.text}</span>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">The tactical report is ready at full time.</div>
            )
          )}
          {tab === 'Gameplan' && (
            <div className="lineups">
              {result.tactics.map((t, s) => (
                <div key={s} className="stack" style={{ gap: 8 }}>
                  <h3>{result.names[s]}</h3>
                  <p className="small"><span className="dim">Build-up</span> {t.buildUp}</p>
                  <p className="small"><span className="dim">Defence</span> {t.defence}</p>
                  <p className="small"><span className="dim">Width</span> <span className="num">{t.width}</span> <span className="dim">Line</span> <span className="num">{t.line}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!done && (
        <div className="row">
          <button className="btn ghost" onClick={() => setStep(last)}><FastForward /> Skip to full time</button>
        </div>
      )}
    </div>
  )
}
