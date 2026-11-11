// Team of Winners draft: pick an empty slot, spin a wheel of competitions, take a player from the holder's squad.
import type { Player, Pos } from '../data/players'
import { COMPETITIONS, squadOf, type Competition } from '../data/winners'
import { effectiveOvr } from './position'
import { pick, type Rng } from './rng'

export const BENCH_SLOTS = 9
export const ROUNDS = 11 + BENCH_SLOTS // 20 picks each
export const DEFAULT_SHAPE = '4-4-2'
/** Positions that may fill a slot besides the slot itself (a winger can play wide midfield, not centre-back). */
const NEIGHBOURS: Record<Pos, Pos[]> = {
  GK: [], CB: [], LB: ['LWB'], RB: ['RWB'], LWB: ['LB', 'LM'], RWB: ['RB', 'RM'], CDM: ['CM'], CM: ['CDM', 'CAM'], CAM: ['CM'],
  LM: ['LW', 'LWB'], RM: ['RW', 'RWB'], LW: ['LM'], RW: ['RM'], ST: [],
}

export type SlotPick = { kind: 'xi'; i: number; pos: Pos } | { kind: 'bench'; i: number }
export const canPlay = (p: Player, slot: SlotPick) => slot.kind === 'bench' || p.positions.some((x) => x === slot.pos || NEIGHBOURS[slot.pos].includes(x))
const rating = (p: Player, slot: SlotPick) => (slot.kind === 'xi' ? effectiveOvr(p, slot.pos) : p.ovr)

/** Untaken players at that team who can fill the slot, best (for that slot) first. */
export function eligible(teamId: string, slot: SlotPick, taken: Set<number>): Player[] {
  return squadOf(teamId).filter((p) => !taken.has(p.id) && canPlay(p, slot)).sort((a, b) => rating(b, slot) - rating(a, slot))
}

/**
 * The wheel for this spin: every competition except those whose holder another player landed this round,
 * and those already ruled out for this turn (nobody left who can play the slot).
 */
export function wheelFor(othersThisRound: string[], ruledOut: string[]): Competition[] {
  return COMPETITIONS.filter((c) => !othersThisRound.includes(c.winner) && !ruledOut.includes(c.id))
}

/** Spin until the landed team has someone for the slot. Returns the competition and every one ruled out on the way. */
export function spinFor(slot: SlotPick, taken: Set<number>, othersThisRound: string[], rng: Rng) {
  const ruledOut: string[] = []
  for (;;) {
    const wheel = wheelFor(othersThisRound, ruledOut)
    if (!wheel.length) return { comp: null, ruledOut }
    const comp = pick(rng, wheel)
    if (eligible(comp.winner, slot, taken).length) return { comp, ruledOut }
    ruledOut.push(comp.id)
  }
}
