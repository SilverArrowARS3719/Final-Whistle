import type { Player, Pos } from '../data/players'
import { FORMATIONS, type Slot } from '../data/formations'
import { AUTOPICK_MAX_OVR, BENCH_SIZE } from './config'
import { penalty, lineOf } from './position'
import { pick, type Rng } from './rng'
import { defaultTactics, type Tactics } from './tactics'

export type Team = {
  name: string
  formation: string
  slots?: Slot[] // set for custom formations
  picks: (Player | null)[] // one per slot, in pick order
  bench: Player[]
  tactics: Tactics
  boost?: number // flat OVR bonus for every player (Stick or Twist "Perfect XI")
  perks?: Record<number, Perk> // per player id, set by Chaos modifier cards
  shielded?: number[] // player ids protected from Steal / Pass It On
}
export type Perk = { captain?: boolean; doubleLink?: boolean; hotHead?: boolean; bigGame?: boolean }

export const doubledIds = (team: Pick<Team, 'perks'>) =>
  new Set(Object.entries(team.perks ?? {}).filter(([, k]) => k.doubleLink).map(([id]) => Number(id)))

export const slotsOf = (team: Pick<Team, 'formation' | 'slots'>) => team.slots ?? FORMATIONS[team.formation]

export function newTeam(name: string, formation: string, custom?: Slot[]): Team {
  const slots = custom ?? FORMATIONS[formation]
  return { name, formation, slots: custom, picks: slots.map(() => null), bench: [], tactics: defaultTactics(slots.map((s) => s.pos)) }
}

// Snake draft: pickNo 0..n*11-1 → index into round-1 order.
export function drafterAt(pickNo: number, order: number[]): number {
  const n = order.length
  const round = Math.floor(pickNo / n)
  const i = pickNo % n
  return order[round % 2 === 0 ? i : n - 1 - i]
}
export const roundOf = (pickNo: number, n: number) => Math.floor(pickNo / n)

export function autoPick(available: Player[], slot: Pos, rng: Rng): Player {
  const fits = available.filter((p) => p.ovr <= AUTOPICK_MAX_OVR && p.positions.includes(slot))
  if (fits.length) return pick(rng, fits)
  // fallback: least out-of-position among the rest
  const best = Math.min(...available.map((p) => penalty(p, slot)))
  return pick(rng, available.filter((p) => penalty(p, slot) === best))
}

// After the draft each team gets a DEF, MID and ATT sub from the leftover pool (<80 OVR when possible).
export function fillBench(teams: Team[], available: Player[], rng: Rng): Team[] {
  let pool = [...available]
  return teams.map((t) => {
    const bench: Player[] = []
    for (const line of ['DEF', 'MID', 'ATT'].slice(0, BENCH_SIZE)) {
      const low = pool.filter((p) => p.ovr <= AUTOPICK_MAX_OVR)
      const cands = low.filter((p) => lineOf(p.positions[0]) === line)
      const choice = cands.length ? pick(rng, cands) : low.length ? pick(rng, low) : pool.length ? pick(rng, pool) : null
      if (choice) {
        bench.push(choice)
        pool = pool.filter((p) => p !== choice)
      }
    }
    return { ...t, bench }
  })
}
