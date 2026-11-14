import { sfx } from '../../game/engine/sfx'
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { PLAYERS, type Player, type Pos } from '../../game/data/players'
import Pitch from '../components/Pitch'
import Ring, { useCountdown } from '../components/Ring'
import { Turn, useCanAct } from '../online'
import { chaosPick, isValid, type Active } from '../../game/engine/chaos'
import { PICK_SECONDS } from '../../game/engine/config'
import { autoPick, drafterAt, slotsOf, type Team } from '../../game/engine/draft'
import { effectiveOvr } from '../../game/engine/position'
import { makeRng } from '../../game/engine/rng'

const ALL_POS: Pos[] = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'LM', 'RM', 'CAM', 'LW', 'RW', 'ST']
// Rows render in pages: 605 rows at once made typing in the search box lag.
const PAGE = 60
const NATIONS = [...new Set(PLAYERS.map((p) => p.nation))].sort()

type Props = {
  teams: Team[]
  order: number[]
  pickNo: number
  teamIndex: number
  slot: number
  taken: Set<number>
  onPick: (p: Player) => void
  card?: Active | null // Chaos card in play: invalid players are blocked
  seconds?: number
  upcoming?: string[] // override the "next picks" strip
  aside?: ReactNode // extra panel pinned above the pitch (Chaos card)
}

export default function Draft({ teams, order, pickNo, teamIndex, slot, taken, onPick, card = null, seconds = PICK_SECONDS, upcoming: upcomingOverride, aside }: Props) {
  const team = teams[teamIndex]
  const slotPos = slotsOf(team)[slot].pos
  const [q, setQ] = useState('')
  const [pos, setPos] = useState<Pos | ''>(card?.card.filter ? '' : slotPos)
  const [nation, setNation] = useState('')
  const [minOvr, setMinOvr] = useState(0)
  const picked = useRef(false)
  const [shown, setShown] = useState(PAGE)

  const choose = (p: Player) => {
    if (picked.current) return
    picked.current = true
    sfx.pick()
    onPick(p)
  }

  // Draft remounts after every handover, so the countdown runs once per pick
  const canAct = useCanAct(teamIndex)
  const left = useCountdown(seconds, () => {
    if (!canAct) return // only the picker's device auto-picks
    const available = PLAYERS.filter((p) => !taken.has(p.id))
    const rng = makeRng(Date.now())
    choose(card ? chaosPick(available, team, slotPos, card, rng) : autoPick(available, slotPos, rng))
  })
  const blocked = (p: Player) => !isValid(p, team, slotPos, card)

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return PLAYERS.filter(
      (p) =>
        (!s || p.name.toLowerCase().includes(s)) &&
        (!pos || p.positions.includes(pos)) &&
        (!nation || p.nation === nation) &&
        p.ovr >= minOvr,
    )
      .map((p) => ({ p, adj: effectiveOvr(p, slotPos) }))
      .sort((a, b) => Number(taken.has(a.p.id) || blocked(a.p)) - Number(taken.has(b.p.id) || blocked(b.p)) || b.adj - a.adj)
  }, [q, pos, nation, minOvr, slotPos, taken, card])

  const n = order.length
  const upcoming = upcomingOverride ?? Array.from({ length: Math.min(6, n * 11 - pickNo) }, (_, k) => teams[drafterAt(pickNo + k, order)].name)

  return (
    <Turn seat={teamIndex}>
    <div>
      <div className="panel draft-bar">
        <Ring left={left} total={seconds} />
        <div>
          <div className="label">Round {slot + 1} of 11</div>
          <h2>{team.name}: your {slotPos}</h2>
        </div>
        <div className="order-strip" aria-label="Next picks">
          {upcoming.map((nm, k) => <span key={k} className={k === 0 ? 'on' : ''}>{nm}</span>)}
        </div>
      </div>

      <div className="split">
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="filters">
            <label style={{ position: 'relative' }}>
              <MagnifyingGlass style={{ position: 'absolute', left: 13, top: 14, color: 'var(--faint)' }} />
              <input aria-label="Search players" placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} autoFocus />
            </label>
            <select aria-label="Position" value={pos} onChange={(e) => setPos(e.target.value as Pos | '')}>
              <option value="">All positions</option>
              {ALL_POS.map((x) => <option key={x}>{x}</option>)}
            </select>
            <select aria-label="Nation" value={nation} onChange={(e) => setNation(e.target.value)}>
              <option value="">All nations</option>
              {NATIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
            <select aria-label="Minimum rating" value={minOvr} onChange={(e) => setMinOvr(Number(e.target.value))}>
              <option value={0}>Any rating</option>
              {[90, 85, 80].map((x) => <option key={x} value={x}>{x}+</option>)}
            </select>
          </div>
          <div className="list-head"><span>OVR · at {slotPos} · player</span><span>{list.length} shown</span></div>
          <div className="plist">
            {list.length === 0 && <div className="empty">No players match. Try clearing the position or nation filter.</div>}
            {list.slice(0, shown).map(({ p, adj }, i) => {
              const isTaken = taken.has(p.id)
              const isBlocked = !isTaken && blocked(p)
              return (
                <button
                  key={p.id}
                  className="prow"
                  disabled={isTaken || isBlocked}
                  title={isBlocked ? `Not allowed: ${card?.card.name}` : undefined}
                  onClick={() => choose(p)}
                  style={i < 14 ? ({ '--i': i } as CSSProperties) : undefined}
                >
                  <span className="o">{p.ovr}</span>
                  <span className={`a ${adj < p.ovr ? 'down' : ''}`}>{adj}{adj < p.ovr && <small> −{p.ovr - adj}</small>}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="n" style={{ display: 'block' }}>{p.name}</span>
                    <span className="sub" style={{ display: 'block' }}>{p.positions.join(' ')} · {p.nation}</span>
                  </span>
                  <span className="sub hide-sm">{p.era} · {p.clubs[0]}</span>
                  {isTaken ? <span className="taken">taken</span> : isBlocked ? <span className="taken">not allowed</span> : <ArrowRight className="go hide-sm" weight="bold" />}
                </button>
              )
            })}
            {list.length > shown && (
              <div className="more"><button className="btn ghost" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button></div>
            )}
          </div>
        </div>
        <div className="stack draft-aside">
          {aside}
          <div className="panel pad">
            <Pitch team={team} active={slot} />
          </div>
        </div>
      </div>
    </div>
    </Turn>
  )
}
