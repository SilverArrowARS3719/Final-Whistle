import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Gavel, Question, SignOut } from '@phosphor-icons/react'
import { PLAYERS, type Player } from '../data/players'
import PlayerCard from '../components/PlayerCard'
import { AUCTION } from '../engine/config'
import { bestSlot, freeFill, nextBidder, openSlots, randomLot, type AuctionKind } from '../engine/auction'
import { slotsOf, type Team } from '../engine/draft'
import { effectiveOvr } from '../engine/position'
import { usePersist } from '../engine/persist'
import { makeRng } from '../engine/rng'
import { sfx } from '../engine/sfx'
import { budgetFor } from './SizePick'
import { HostOnly, Turn, useIsHost } from '../online/context'

type Props = { teams: Team[]; order: number[]; kind: AuctionKind; onDone: (teams: Team[], gone: Set<number>) => void }
type Phase = 'lot' | 'bidding' | 'sold' | 'free'
type Sale = { winner: number | null; price: number; slot: number }
const money = (m: number) => `£${m % 1 ? m.toFixed(1) : m}M`
const RAISES = [0.5, 1, 2, 5]
const rng = makeRng(Date.now())

export default function Auction({ teams: start, order, kind, onDone }: Props) {
  const size = start[0].picks.length as 5 | 7
  const blind = kind === 'blind'
  const [teams, setTeams] = usePersist('auction:teams', start)
  const [budgets, setBudgets] = usePersist('auction:budgets', start.map(() => budgetFor(size)))
  const [gone, setGone] = usePersist<number[]>('auction:gone', [])
  const [lot, setLot] = usePersist<Player | null>('auction:lot', null)
  const [phase, setPhase] = usePersist<Phase>('auction:phase', 'lot')
  const [active, setActive] = usePersist<number[]>('auction:active', [])
  const [leader, setLeader] = usePersist<number | null>('auction:leader', null)
  const [price, setPrice] = usePersist('auction:price', 0)
  const [turn, setTurn] = usePersist('auction:turn', 0)
  const [unsold, setUnsold] = usePersist('auction:unsold', 0)
  const [free, setFree] = usePersist<{ team: number; p: Player }[]>('auction:free', [])
  const [sale, setSale] = usePersist<Sale | null>('auction:sale', null)
  const [lots, setLots] = usePersist('auction:lots', 0)

  const finished = useRef(false)
  const isHost = useIsHost()
  const available = (ts: Team[], g: number[]) => {
    const used = new Set([...g, ...ts.flatMap((t) => t.picks.filter(Boolean).map((p) => p!.id))])
    return PLAYERS.filter((p) => !used.has(p.id))
  }

  // Next lot, or free players when bidding no longer makes sense:
  // only one team still needs players, nobody else can afford a bid, or too many lots in a row went unsold.
  const openLot = (ts: Team[], bs: number[], g: number[], unsoldRun: number) => {
    const need = order.filter((i) => openSlots(ts[i]).length)
    if (!need.length) {
      if (!finished.current) onDone(ts, new Set(g)) // a double-tap on the last "Next lot" must not finish twice
      finished.current = true
      return
    }
    const bidders = need.filter((i) => bs[i] >= AUCTION.minBid)
    if (need.length === 1 || bidders.length <= 1 || unsoldRun >= AUCTION.maxUnsoldInARow) {
      const everyone = need.length === 1 || bidders.length <= 1
      const r = freeFill(ts, need, available(ts, g), rng, everyone ? Infinity : 1)
      setTeams(r.teams)
      setFree(r.given)
      setUnsold(0)
      setPhase('free')
      return
    }
    setTeams(ts)
    setBudgets(bs)
    setGone(g)
    setUnsold(unsoldRun)
    setLot(randomLot(available(ts, g), rng))
    setLots(lots + 1)
    setActive(bidders)
    setLeader(null)
    setPrice(0)
    setTurn(bidders[0])
    setSale(null)
    setPhase('lot')
    sfx.flip()
  }

  // first visit opens the first lot; after a refresh the saved lot is kept
  useEffect(() => {
    if (!lot && phase === 'lot' && isHost) openLot(teams, budgets, gone, 0) // one device draws the lot
  }, [])

  const advance = (from: number, act: number[], lead: number | null) => {
    const next = nextBidder(order, act, lead, from)
    if (next !== null) return setTurn(next)
    // bidding over
    if (lead === null) {
      setSale({ winner: null, price: 0, slot: -1 })
    } else {
      const slot = bestSlot(teams[lead], lot!)
      setSale({ winner: lead, price, slot })
      sfx.sold()
    }
    setPhase('sold')
  }
  const raise = (to: number) => {
    setPrice(to)
    setLeader(turn)
    // the price used in advance() must be the new one
    const next = nextBidder(order, active, turn, turn)
    if (next !== null) return setTurn(next)
    setSale({ winner: turn, price: to, slot: bestSlot(teams[turn], lot!) })
    sfx.sold()
    setPhase('sold')
  }
  const drop = () => {
    const act = active.filter((i) => i !== turn)
    setActive(act)
    advance(turn, act, leader)
  }

  const afterSale = () => {
    if (!sale || !lot) return
    if (sale.winner === null) return openLot(teams, budgets, [...gone, lot.id], unsold + 1)
    const w = sale.winner
    const ts = teams.map((t, i) => (i === w ? { ...t, picks: t.picks.map((x, j) => (j === sale.slot ? lot : x)) } : t))
    const bs = budgets.map((b, i) => (i === w ? Math.round((b - sale.price) * 10) / 10 : b))
    openLot(ts, bs, gone, 0)
  }

  const board = (
    <div className="panel pad auction-board">
      {order.map((i) => (
        <div key={i} className={`ab-row ${phase === 'bidding' && i === turn ? 'turn' : ''} ${leader === i && phase === 'bidding' ? 'leading' : ''}`}>
          <span className="ab-name">{teams[i].name}{phase === 'bidding' && !active.includes(i) && openSlots(teams[i]).length > 0 && <span className="dim small"> · out</span>}</span>
          <span className="num ab-money">{money(budgets[i])}</span>
          <div className="ab-bar"><motion.span animate={{ width: `${(budgets[i] / budgetFor(size)) * 100}%` }} /></div>
          <div className="ab-slots">
            {slotsOf(teams[i]).map((s, j) => (
              <span key={j} className={teams[i].picks[j] ? 'on' : ''} title={teams[i].picks[j]?.name ?? s.pos}>{teams[i].picks[j]?.ovr ?? s.pos}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (phase === 'free')
    return (
      <div className="split">
        <div className="stack">
          <h2>Free players</h2>
          <p className="dim">
            {order.filter((i) => openSlots(teams[i]).length).length === 0 && free.length
              ? 'Only one team still needed players, so there was nothing to bid against. They get the rest for free:'
              : `${AUCTION.maxUnsoldInARow} lots in a row went unsold, or nobody else could afford a bid. Free players for whoever still needs one:`}
          </p>
          <div className="pick-grid">
            {free.map(({ team, p }) => (
              <motion.div key={p.id} className="pick-tile" initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 90, damping: 14 }}>
                <PlayerCard p={p} tilt={false} /><span className="tag">{teams[team].name}</span>
              </motion.div>
            ))}
          </div>
          <HostOnly><div><button className="btn primary lg" onClick={() => openLot(teams, budgets, gone, 0)}>Continue <ArrowRight weight="bold" /></button></div></HostOnly>
        </div>
        {board}
      </div>
    )

  if (!lot) return null
  const showPlayer = !blind || phase === 'sold'
  const card = showPlayer ? (
    <motion.div key={`face-${lot.id}`} initial={{ rotateY: 180, scale: 0.8 }} animate={{ rotateY: 0, scale: 1.3 }} transition={{ type: 'spring', stiffness: 80, damping: 13 }} style={{ transformPerspective: 1000 }}>
      <PlayerCard p={lot} />
    </motion.div>
  ) : (
    <motion.div key="mystery" className="pcard mystery" initial={{ rotateY: -90 }} animate={{ rotateY: 0, scale: 1.3 }} transition={{ type: 'spring', stiffness: 80, damping: 13 }}>
      <Question size={72} weight="bold" />
      <span className="nm">Mystery player</span>
    </motion.div>
  )

  if (phase === 'lot')
    return (
      <div className="split">
        <div className="chaos-stage" style={{ minHeight: 0 }}>
          <span className="dim">Lot {lots}{blind ? ' · Blind auction' : ''}</span>
          <div style={{ margin: '60px 0' }}>{card}</div>
          <p className="dim" style={{ maxWidth: '46ch' }}>
            {blind ? 'Nobody knows who this is until someone wins him. Could be a legend, could be a squad player.' : 'Any position: whoever wins him puts him in their best-fitting open slot.'} {active.map((i) => teams[i].name).join(', ')} can bid.
          </p>
          <HostOnly><button className="btn primary lg" onClick={() => setPhase('bidding')}><Gavel weight="fill" /> Start bidding</button></HostOnly>
        </div>
        {board}
      </div>
    )

  if (phase === 'bidding') {
    const max = budgets[turn]
    return (
      <div className="split">
        <Turn seat={turn}>
        <div className="chaos-stage bid-stage" style={{ minHeight: 0 }}>
          <div style={{ margin: '50px 0 40px' }}>{card}</div>
          <div className="price">
            <span className="dim">{leader === null ? 'No bids yet' : `${teams[leader].name} leads`}</span>
            <motion.b key={price} className="num" initial={{ scale: 1.4, color: '#d2ef5b' }} animate={{ scale: 1, color: '#e9eee4' }}>{money(price)}</motion.b>
          </div>
          <h2 className="to-act">{teams[turn].name}, your bid</h2>
          <div className="row" style={{ justifyContent: 'center' }}>
            {RAISES.map((r) => {
              const to = Math.round((price + r) * 10) / 10
              return <button key={r} className="btn primary" disabled={to > max} onClick={() => raise(to)}>{money(to)}</button>
            })}
            <button className="btn glass" disabled={max <= price} onClick={() => raise(max)}>All in {money(max)}</button>
          </div>
          <button className="btn ghost" onClick={drop}><SignOut weight="bold" /> Drop out</button>
          <p className="small dim">Budget {money(max)}. Bids are open: everyone sees them. Last bidder standing wins.</p>
        </div>
        </Turn>
        {board}
      </div>
    )
  }

  // sold / unsold reveal
  return (
    <div className="split">
      <div className="chaos-stage" style={{ minHeight: 0 }}>
        <div style={{ position: 'relative', margin: '60px 0' }}>
          {card}
          <motion.div className={`stamp ${sale?.winner !== null ? 'sold' : 'unsold'}`} initial={{ scale: 3, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ delay: blind ? 0.9 : 0.3, type: 'spring', stiffness: 260, damping: 14 }}>
            {sale?.winner !== null ? `Sold ${money(sale!.price)}` : 'Unsold'}
          </motion.div>
        </div>
        <p className="dim">
          {sale && sale.winner !== null ? (
            <>
              <b style={{ color: 'var(--chalk)' }}>{teams[sale.winner].name}</b> {blind ? 'won the mystery player: ' : 'wins '}
              <b style={{ color: 'var(--chalk)' }}>{lot.name}</b> ({lot.ovr}), going in at {slotsOf(teams[sale.winner])[sale.slot].pos} as a {effectiveOvr(lot, slotsOf(teams[sale.winner])[sale.slot].pos)}.
            </>
          ) : (
            <>Nobody bid. {blind ? `It was ${lot.name} (${lot.ovr}). ` : ''}{lot.name.split(' ').slice(-1)[0]} is gone for good.</>
          )}
        </p>
        <HostOnly><button className="btn primary lg" onClick={afterSale}>Next lot <ArrowRight weight="bold" /></button></HostOnly>
      </div>
      {board}
    </div>
  )
}
