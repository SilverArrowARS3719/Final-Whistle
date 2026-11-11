import { AnimatePresence, motion } from 'motion/react'
import { ArrowsClockwise, Trophy, WarningCircle } from '@phosphor-icons/react'
import { COMPETITIONS, TEAMS, type Competition } from '../data/winners'
import type { Player } from '../data/players'
import CompetitionWheel from '../components/CompetitionWheel'
import Pitch from '../components/Pitch'
import PlayerCard from '../components/PlayerCard'
import { usePersist } from '../engine/persist'
import { drafterAt, slotsOf, type Team } from '../engine/draft'
import { effectiveOvr } from '../engine/position'
import { makeRng, pick } from '../engine/rng'
import { BENCH_SLOTS, ROUNDS, eligible, wheelFor, type SlotPick } from '../engine/winners'
import { Turn } from '../online/context'
import Handover from './Handover'

type Landed = { round: number; by: number; team: string; comp: string }
type TurnState = { slot: SlotPick | null; spin: { comp: string; at: number } | null; landed: boolean; ruledOut: string[] }
const FRESH: TurnState = { slot: null, spin: null, landed: false, ruledOut: [] }
const compById = (id: string) => COMPETITIONS.find((c) => c.id === id)!

export function TeamChip({ id }: { id: string }) {
  const t = TEAMS[id]
  return <span className="team-chip"><i style={{ background: `linear-gradient(135deg, ${t.colors[0]} 50%, ${t.colors[1]} 50%)` }} />{t.name}</span>
}

export default function WinnersDraft({ teams: start, order, onDone }: { teams: Team[]; order: number[]; onDone: (teams: Team[]) => void }) {
  const n = order.length
  const [teams, setTeams] = usePersist('winners:teams', start)
  const [bench, setBench] = usePersist<(Player | null)[][]>('winners:bench', () => start.map(() => Array(BENCH_SLOTS).fill(null)))
  const [pickNo, setPickNo] = usePersist('winners:pick', 0)
  const [history, setHistory] = usePersist<Landed[]>('winners:landed', [])
  const [turn, setTurn] = usePersist<TurnState>('winners:turn', FRESH)
  const [passing, setPassing] = usePersist('winners:passing', true)

  const round = Math.floor(pickNo / n)
  const ti = drafterAt(pickNo, order)
  const team = teams[ti]
  const slots = slotsOf(team)
  const taken = new Set([...teams.flatMap((t) => t.picks), ...bench.flat()].filter((p): p is Player => !!p).map((p) => p.id))
  const thisRound = history.filter((h) => h.round === round)
  const others = thisRound.filter((h) => h.by !== ti).map((h) => h.team)
  const wheel = wheelFor(others, turn.ruledOut)
  const comp: Competition | null = turn.landed && turn.spin ? compById(turn.spin.comp) : null
  const options = comp && turn.slot ? eligible(comp.winner, turn.slot, taken) : []
  const last = history.at(-1)

  const spin = () => {
    if (!turn.slot || !wheel.length) return
    const c = pick(makeRng(Date.now()), wheel)
    setTurn({ ...turn, spin: { comp: c.id, at: Date.now() }, landed: false })
  }
  const landed = () => {
    if (!turn.spin || !turn.slot) return
    const c = compById(turn.spin.comp)
    // nobody at that club can fill the slot: take it off the wheel for this turn and spin again
    if (!eligible(c.winner, turn.slot, taken).length) setTurn({ ...turn, landed: true, ruledOut: [...turn.ruledOut, c.id] })
    else setTurn({ ...turn, landed: true })
  }
  const choose = (p: Player) => {
    const s = turn.slot!
    const nextTeams = s.kind === 'xi' ? teams.map((t, i) => (i === ti ? { ...t, picks: t.picks.map((x, j) => (j === s.i ? p : x)) } : t)) : teams
    const nextBench = s.kind === 'bench' ? bench.map((b, i) => (i === ti ? b.map((x, j) => (j === s.i ? p : x)) : b)) : bench
    setHistory([...history, { round, by: ti, team: compById(turn.spin!.comp).winner, comp: turn.spin!.comp }])
    if (pickNo + 1 === n * ROUNDS) return onDone(nextTeams.map((t, i) => ({ ...t, bench: nextBench[i].filter((x): x is Player => !!x) })))
    setTeams(nextTeams)
    setBench(nextBench)
    setPickNo(pickNo + 1)
    setTurn(FRESH)
    setPassing(true)
  }

  if (passing) {
    const prev = last && teams[last.by]
    return (
      <Handover
        name={team.name}
        lastTeam={prev?.name}
        nextPos="any empty slot"
        hint={last && prev ? <>Last pick: <b>{prev.name}</b> spun <b>{compById(last.comp).name}</b> and took a {TEAMS[last.team].name} player.</> : <>Pick a slot, spin the wheel, take a player from whoever holds that trophy.</>}
        pickNo={pickNo}
        total={n * ROUNDS}
        onReady={() => setPassing(false)}
        seat={ti}
      />
    )
  }

  const slotLabel = (s: SlotPick) => (s.kind === 'xi' ? s.pos : `Bench ${s.i + 1}`)
  const missed = turn.landed && turn.spin && turn.ruledOut.includes(turn.spin.comp)

  return (
    <div className="wd">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Round {round + 1} of {ROUNDS}</span>
          <h2>{team.name}{turn.slot ? `: your ${slotLabel(turn.slot)}` : ': pick a slot'}</h2>
        </div>
        {thisRound.length > 0 && (
          <div className="wd-round" aria-label="Already landed this round">
            {thisRound.map((h, k) => <span key={k}>{teams[h.by].name}: <TeamChip id={h.team} /></span>)}
          </div>
        )}
      </div>

      <div className="split">
        <Turn seat={ti}>
          <div className="panel pad stack wd-main">
            {!turn.slot && (
              <>
                <p className="dim">Tap the slot you want to fill this turn. Then spin: you get a player from whoever holds the trophy it lands on.</p>
                <div className="wd-slots">
                  {slots.map((s, i) => (
                    <button key={i} className={`wd-slot ${team.picks[i] ? 'full' : ''}`} disabled={!!team.picks[i]} onClick={() => setTurn({ ...FRESH, slot: { kind: 'xi', i, pos: s.pos } })}>
                      <b>{s.pos}</b><span>{team.picks[i]?.name ?? 'Empty'}</span>
                    </button>
                  ))}
                </div>
                <span className="label">Bench</span>
                <div className="wd-slots bench">
                  {bench[ti].map((p, i) => (
                    <button key={i} className={`wd-slot ${p ? 'full' : ''}`} disabled={!!p} onClick={() => setTurn({ ...FRESH, slot: { kind: 'bench', i } })}>
                      <b>SUB</b><span>{p?.name ?? 'Any position'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {turn.slot && !comp && (
              <div className="stack wd-spin">
                <CompetitionWheel comps={wheel.length ? wheel : COMPETITIONS} spin={turn.spin} onLanded={landed} />
                <div className="row" style={{ justifyContent: 'center' }}>
                  {!turn.spin && <button className="btn ghost" onClick={() => setTurn(FRESH)}>Change slot</button>}
                  <button className="btn primary lg" onClick={spin} disabled={!!turn.spin && !turn.landed}><ArrowsClockwise weight="bold" /> {turn.spin ? 'Spinning…' : 'Spin'}</button>
                </div>
                <p className="small dim" style={{ textAlign: 'center' }}>{wheel.length} competitions on the wheel{others.length ? `; clubs others got this round are off it` : ''}.</p>
              </div>
            )}

            {missed && (
              <div className="stack wd-spin">
                <p className="shape-error" role="alert"><WarningCircle weight="fill" /> Nobody left at {TEAMS[compById(turn.spin!.comp).winner].name} can play {slotLabel(turn.slot!)}. It's off the wheel: spin again.</p>
                <button className="btn primary lg" onClick={() => setTurn({ ...turn, spin: null, landed: false })}><ArrowsClockwise weight="bold" /> Spin again</button>
              </div>
            )}

            {comp && !missed && (
              <div className="stack">
                <motion.div className="wd-landed" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
                  <Trophy weight="fill" />
                  <div>
                    <span className="label">{comp.name} {comp.edition}</span>
                    <h3><TeamChip id={comp.winner} /></h3>
                    {comp.note && <span className="small dim">{comp.note}</span>}
                  </div>
                </motion.div>
                <p className="dim small">Pick one for your {slotLabel(turn.slot!)}. Their current squad, best first.</p>
                <div className="pick-grid">
                  <AnimatePresence>
                    {options.map((p, k) => (
                      <motion.button key={p.id} className="pick-tile" onClick={() => choose(p)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 12) * 0.03 }}>
                        <PlayerCard p={p} ovr={turn.slot!.kind === 'xi' ? effectiveOvr(p, turn.slot!.pos) : p.ovr} tilt={false} />
                        <span className="tag">{p.positions.join(' · ')}</span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </Turn>

        <div className="panel pad stack" style={{ position: 'sticky', top: 16 }}>
          <Pitch team={team} active={turn.slot?.kind === 'xi' ? turn.slot.i : undefined} compact />
          <span className="small dim">Bench: {bench[ti].filter(Boolean).map((p) => p!.name).join(', ') || 'empty'}</span>
        </div>
      </div>
    </div>
  )
}
