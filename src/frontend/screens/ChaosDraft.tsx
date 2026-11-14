import { type ReactNode } from 'react'
import { usePersist } from '../../game/engine/persist'
import { motion } from 'motion/react'
import { ArrowRight, ShieldCheck, HandGrabbing, Shuffle } from '@phosphor-icons/react'
import { PLAYERS, type Player, type Pos } from '../../game/data/players'
import { ChaosDeal, CardFace } from '../components/ChaosCard'
import PlayerCard from '../components/PlayerCard'
import { CHAOS, PICK_SECONDS } from '../../game/engine/config'
import { chaosPick, drawCard, drawEvent, passItOn, steal, type Active, type ChaosSettings } from '../../game/engine/chaos'
import { drafterAt, slotsOf, type Team } from '../../game/engine/draft'
import { effectiveOvr } from '../../game/engine/position'
import { makeRng } from '../../game/engine/rng'
import Draft from './Draft'
import Handover from './Handover'
import { HostOnly, Turn, useIsHost } from '../online'

type Props = { teams: Team[]; order: number[]; settings: ChaosSettings; onDone: (teams: Team[], gone: Set<number>) => void }
type Phase = 'flip' | 'shield' | 'pick' | 'passed'
type Deal = { cards: (Active | null)[]; event: Active | null } // one card per team + an optional table card
const PERK_EFFECTS = ['captain', 'doubleLink', 'hotHead', 'bigGame'] as const
const rng = makeRng(Date.now())

export default function ChaosDraft({ teams: start, order, settings, onDone }: Props) {
  const n = order.length
  const isHost = useIsHost()
  const [teams, setTeams] = usePersist('chaos:teams', start)
  const [round, setRound] = usePersist('chaos:round', 0)
  const [hist, setHist] = usePersist<Active[][]>('chaos:hist', () => start.map(() => []))
  const [events, setEvents] = usePersist<Active[]>('chaos:events', [])
  const [dealt, setDealt] = usePersist<Deal>('chaos:deal', () => deal(0, start.map(() => []), [], start))
  const [phase, setPhase] = usePersist<Phase>('chaos:phase', dealt.cards.some(Boolean) ? 'flip' : 'pick')
  const [k, setK] = usePersist('chaos:k', 0) // whose turn within the current phase
  const [passing, setPassing] = usePersist('chaos:passing', true)
  const [stole, setStole] = usePersist('chaos:stole', false) // the current drafter has used (or skipped) their Steal
  const [last, setLast] = usePersist<{ team: string; p: Player; pos: Pos } | null>('chaos:last', null)
  const [dipped, setDipped] = usePersist<Player | null>('chaos:dipped', null)

  function deal(r: number, h: Active[][], ev: Active[], ts: Team[]): Deal {
    if (r % settings.every !== 0) return { cards: ts.map(() => null), event: null }
    const taken = new Set(ts.flatMap((t) => t.picks.filter(Boolean).map((p) => p!.id)))
    const pool = PLAYERS.filter((p) => !taken.has(p.id))
    return {
      cards: ts.map((t, i) => drawCard(h[i].map((x) => x.card), r, t, pool, settings, rng)),
      event: drawEvent(ev.map((x) => x.card), r, settings, rng),
    }
  }

  const taken = new Set(teams.flatMap((t) => t.picks.filter(Boolean).map((p) => p!.id)))
  const available = PLAYERS.filter((p) => !taken.has(p.id))
  const event = dealt.event?.card.effect
  const baseOrder = Array.from({ length: n }, (_, i) => drafterAt(round * n + i, order))
  const roundOrder = event === 'reverse' ? [...baseOrder].reverse() : baseOrder
  const ti = roundOrder[Math.min(k, n - 1)]
  const team = teams[ti]
  const slotPos = slotsOf(team)[round].pos
  const mine = dealt.cards[ti]
  const effect = mine?.card.effect

  const afterFlip = () => {
    setK(0)
    setPassing(true)
    setStole(false)
    setPhase(event === 'shield' ? 'shield' : 'pick')
  }

  const nextRound = (ts: Team[]) => {
    const h = hist.map((x, i) => (dealt.cards[i] ? [...x, dealt.cards[i]!] : x))
    const ev = dealt.event ? [...events, dealt.event] : events
    if (round === 10) return onDone(ts, new Set())
    const d = deal(round + 1, h, ev, ts)
    setHist(h)
    setEvents(ev)
    setRound(round + 1)
    setDealt(d)
    setK(0)
    setPassing(true)
    setStole(false)
    setPhase(d.cards.some(Boolean) ? 'flip' : 'pick')
  }

  const pickPlayer = (p: Player) => {
    const perk = PERK_EFFECTS.find((e) => e === effect)
    const next = teams.map((t, i) =>
      i === ti
        ? { ...t, picks: t.picks.map((x, j) => (j === round ? p : x)), perks: perk ? { ...t.perks, [p.id]: { ...t.perks?.[p.id], [perk]: true } } : t.perks }
        : t,
    )
    setTeams(next)
    setLast({ team: team.name, p, pos: slotPos })
    setDipped(null)
    setStole(false)
    if (k < n - 1) {
      setK(k + 1)
      setPassing(true)
      return
    }
    if (event === 'passItOn') {
      setTeams(passItOn(next, round))
      setPhase('passed')
      return
    }
    nextRound(next)
  }

  const handover = (onReady: () => void, hint?: ReactNode) => (
    <Handover
      name={team.name}
      // straight after a card flip the last pick is old news; only show it mid-round
      lastTeam={k > 0 ? last?.team : undefined}
      lastPick={k > 0 ? last?.p : undefined}
      lastOvr={k > 0 && last ? effectiveOvr(last.p, last.pos) : undefined}
      lastPos={k > 0 ? last?.pos : undefined}
      nextPos={slotPos}
      hint={hint}
      pickNo={round * n + k}
      total={n * 11}
      onReady={onReady}
    />
  )

  const dock = (
    <div className="chaos-dock">
      {mine ? <CardFace a={mine} small /> : <div className="chaos-card small none"><h3>Normal round</h3></div>}
      <div className="chaos-history" aria-label="This round's cards">
        {dealt.event && <span className="table" title={dealt.event.card.description(dealt.event.ctx)}>Table: {dealt.event.card.name}</span>}
        {dealt.cards.map((c, i) => c && i !== ti && <span key={i} className={c.card.rarity} title={c.card.description(c.ctx)}>{teams[i].name}: {c.card.name}</span>)}
      </div>
    </div>
  )

  if (phase === 'flip') return <ChaosDeal deals={dealt.cards.map((a, i) => ({ name: teams[i].name, a }))} event={dealt.event} round={round} onDone={afterFlip} canContinue={isHost} />

  if (phase === 'shield') {
    if (passing) return handover(() => setPassing(false), <>Shield round: protect one of your players from steals and swaps.</>)
    const choose = (id: number | null) => {
      const next = id === null ? teams : teams.map((t, i) => (i === ti ? { ...t, shielded: [...(t.shielded ?? []), id] } : t))
      setTeams(next)
      if (k < n - 1) { setK(k + 1); setPassing(true) } else { setK(0); setPassing(true); setPhase('pick') }
    }
    return (
      <Turn seat={ti}><div className="stack">
        {dock}
        <h2><ShieldCheck weight="fill" color="var(--accent)" /> {team.name}: shield one player</h2>
        <div className="pick-grid">
          {team.picks.filter(Boolean).map((p) => (
            <button key={p!.id} className="pick-tile" disabled={team.shielded?.includes(p!.id)} onClick={() => choose(p!.id)}>
              <PlayerCard p={p!} tilt={false} />
              {team.shielded?.includes(p!.id) && <span className="tag">Already shielded</span>}
            </button>
          ))}
        </div>
        <div><button className="btn ghost" onClick={() => choose(null)}>No shield</button></div>
      </div></Turn>
    )
  }

  if (phase === 'passed') {
    return (
      <div className="stack">
        {dock}
        <h2><Shuffle weight="bold" color="var(--accent)" /> Pass it on</h2>
        <p className="dim">Everyone's newest pick moved one seat to the left. Shielded players stayed put.</p>
        <div className="formations">
          {teams.map((t, i) => (
            <motion.div key={i} className="panel pad stack" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
              <h3>{t.name}</h3>
              <PlayerCard p={t.picks[round]!} ovr={effectiveOvr(t.picks[round]!, slotsOf(t)[round].pos)} />
            </motion.div>
          ))}
        </div>
        <HostOnly><div><button className="btn primary lg" onClick={() => nextRound(teams)}>Next round <ArrowRight weight="bold" /></button></div></HostOnly>
      </div>
    )
  }

  // pick phase
  if (passing) return handover(() => {
    setPassing(false)
    if (effect === 'luckyDip') setDipped(chaosPick(available, team, slotPos, mine, rng, false))
  }, mine && mine.card.id !== 'calm' ? <>Your card: <b className="accent">{mine.card.name}</b>. {mine.card.description(mine.ctx)}</> : undefined)

  if (effect === 'steal' && !stole && round > 0) {
    const done = (next: Team[]) => { setTeams(next); setStole(true) }
    return (
      <Turn seat={ti}><div className="stack">
        {dock}
        <h2><HandGrabbing weight="fill" color="var(--accent)" /> {team.name}: steal a player</h2>
        <p className="dim">He replaces your player in the same slot (yours goes back to the pool). They get a random sub-80 player instead.</p>
        {teams.map((t, vi) => vi !== ti && (
          <div key={vi} className="stack" style={{ gap: 8 }}>
            <span className="label">{t.name}</span>
            <div className="pick-grid">
              {t.picks.slice(0, round).map((p, slotIdx) => p && (
                <button key={p.id} className="pick-tile" disabled={t.shielded?.includes(p.id)} onClick={() => done(steal(teams, ti, vi, slotIdx, available, rng))}>
                  <PlayerCard p={p} tilt={false} />
                  <span className="tag">{t.shielded?.includes(p.id) ? 'Shielded' : `${slotsOf(t)[slotIdx].pos} → your ${slotsOf(team)[slotIdx].pos}`}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div><button className="btn ghost" onClick={() => done(teams)}>Don't steal</button></div>
      </div></Turn>
    )
  }

  if (effect === 'luckyDip' && dipped) {
    return (
      <div className="chaos-stage">
        {dock}
        <span className="label">Lucky Dip · {team.name}'s {slotPos}</span>
        <motion.div initial={{ rotateY: 180, scale: 0.7 }} animate={{ rotateY: 0, scale: 1.3 }} transition={{ type: 'spring', stiffness: 70, damping: 12 }} style={{ margin: '50px 0', transformPerspective: 1000 }}>
          <PlayerCard p={dipped} ovr={effectiveOvr(dipped, slotPos)} />
        </motion.div>
        <Turn seat={ti}><button className="btn primary lg" onClick={() => pickPlayer(dipped)} autoFocus>Take him <ArrowRight weight="bold" /></button></Turn>
      </div>
    )
  }

  return (
    <div className="stack">
      <Draft
        aside={dock}
        teams={teams}
        order={order}
        pickNo={round * n + k}
        teamIndex={ti}
        slot={round}
        taken={taken}
        onPick={pickPlayer}
        card={mine}
        seconds={effect === 'speed' ? CHAOS.speedSeconds : PICK_SECONDS}
        upcoming={roundOrder.slice(k).map((i) => teams[i].name)}
      />
    </div>
  )
}
