import type { Player, Pos } from '../data/players'
import { AUCTION } from './config'
import { slotsOf, type Team } from './draft'
import { lineOf, penalty } from './position'
import { pick, type Rng } from './rng'

export type AuctionKind = 'classic' | 'blind'

// Lots are any random untaken player, whatever position: that keeps every team interested in every lot.
export const randomLot = (available: Player[], rng: Rng): Player | null => (available.length ? pick(rng, available) : null)

export const openSlots = (t: Team) => t.picks.map((p, i) => (p ? -1 : i)).filter((i) => i >= 0)

// The open slot a won player fits best (lowest out-of-position penalty).
export function bestSlot(team: Team, p: Player): number {
  const slots = slotsOf(team)
  return openSlots(team).sort((a, b) => penalty(p, slots[a].pos) - penalty(p, slots[b].pos))[0]
}

// Free player for a slot nobody bought: under 75 who can play it, else the lowest-rated fit.
export function leftover(slot: Pos, available: Player[], rng: Rng): Player {
  const fits = available.filter((p) => p.positions.includes(slot))
  const cheap = fits.filter((p) => p.ovr <= AUCTION.leftoverMax)
  if (cheap.length) return pick(rng, cheap)
  const pool = fits.length ? fits : available.filter((p) => lineOf(p.positions[0]) === lineOf(slot))
  return [...(pool.length ? pool : available)].sort((a, b) => a.ovr - b.ovr)[0]
}

// Fill open slots of the given teams for free (up to `perTeam` each). Returns the new teams and what was handed out.
export function freeFill(teams: Team[], who: number[], available: Player[], rng: Rng, perTeam = Infinity) {
  let pool = [...available]
  const given: { team: number; p: Player }[] = []
  const next = teams.map((t, i) => {
    if (!who.includes(i)) return t
    const picks = [...t.picks]
    for (const s of openSlots(t).slice(0, perTeam)) {
      const p = leftover(slotsOf(t)[s].pos, pool, rng)
      picks[s] = p
      pool = pool.filter((x) => x !== p)
      given.push({ team: i, p })
    }
    return { ...t, picks }
  })
  return { teams: next, given }
}

// Open bidding: whose turn is next after `from`, skipping the current leader. null = bidding is over.
export function nextBidder(order: number[], active: number[], leader: number | null, from: number): number | null {
  const contenders = order.filter((i) => active.includes(i) && i !== leader)
  if (!contenders.length) return null
  const after = order.slice(order.indexOf(from) + 1).concat(order.slice(0, order.indexOf(from) + 1))
  return after.find((i) => contenders.includes(i)) ?? null
}
