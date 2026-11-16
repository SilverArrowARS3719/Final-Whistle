import { PLAYERS, type Player, type Pos } from '../data/players'
import type { Team } from './draft'
import { penalty } from './position'
import { pick, type Rng } from './rng'

export const POOL_AVG = PLAYERS.reduce((s, p) => s + p.ovr, 0) / PLAYERS.length

export const teamTotal = (t: Team) => t.picks.reduce((s, p) => s + (p?.ovr ?? 0), 0)

// Natural position first, then anyone who lists the position, then the closest fit.
export function deal(available: Player[], slot: Pos, rng: Rng): Player {
  const natural = available.filter((p) => p.positions[0] === slot)
  if (natural.length) return pick(rng, natural)
  const listed = available.filter((p) => p.positions.includes(slot))
  if (listed.length) return pick(rng, listed)
  const best = Math.min(...available.map((p) => penalty(p, slot)))
  return pick(rng, available.filter((p) => penalty(p, slot) === best))
}
