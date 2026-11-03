import { PLAYERS, type Player, type Pos } from '../data/players'
import { SOT } from './config'
import { slotsOf, type Team } from './draft'
import { penalty } from './position'
import { pick, type Rng } from './rng'

export const POOL_AVG = PLAYERS.reduce((s, p) => s + p.ovr, 0) / PLAYERS.length
// Cap comes from the data, so it stays fair as the database grows.
export const teamCap = (slots = 11, margin = SOT.capMargin) => Math.round(slots * (POOL_AVG + margin))

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

export type Verdict = { kind: 'bust' | 'perfect' | 'safe'; total: number; swaps: { out: Player; in: Player }[] }

// Applied once after the last slot: bust swaps the highest-rated player for a sub-75 until under the cap.
export function settle(team: Team, available: Player[], cap: number, rng: Rng): { team: Team; verdict: Verdict; used: Player[] } {
  const total = teamTotal(team)
  if (total <= cap) {
    const perfect = total >= cap - SOT.perfectWindow
    return { team: perfect ? { ...team, boost: 2 } : team, verdict: { kind: perfect ? 'perfect' : 'safe', total, swaps: [] }, used: [] }
  }
  const picks = [...team.picks] as Player[]
  const slots = slotsOf(team)
  let pool = [...available]
  const swaps: Verdict['swaps'] = []
  const tried = new Set<number>()
  while (picks.reduce((s, p) => s + p.ovr, 0) > cap && tried.size < picks.length) {
    const i = picks.map((p, k) => [p, k] as const).filter(([, k]) => !tried.has(k)).sort((a, b) => b[0].ovr - a[0].ovr)[0][1]
    tried.add(i)
    const pos = slots[i].pos
    const fits = pool.filter((p) => p.positions.includes(pos))
    const cheap = fits.filter((p) => p.ovr <= SOT.bustReplaceMax)
    const sub = cheap.length ? pick(rng, cheap) : [...(fits.length ? fits : pool)].sort((a, b) => a.ovr - b.ovr)[0]
    if (!sub) break
    swaps.push({ out: picks[i], in: sub })
    picks[i] = sub
    pool = pool.filter((p) => p !== sub)
  }
  return { team: { ...team, picks }, verdict: { kind: 'bust', total, swaps }, used: swaps.map((s) => s.in) }
}

// Average OVR each remaining slot can still afford.
export const neededPerSlot = (total: number, cap: number, slotsLeft: number) => (slotsLeft ? (cap - total) / slotsLeft : 0)
