import type { Player, Pos } from '../data/players'
import { PENALTY, POS_GEOM } from './config'

function rawPenalty(from: Pos, to: Pos): number {
  if (from === to) return 0
  if (to === 'GK') return PENALTY.outfieldInGoal
  if (from === 'GK') return PENALTY.keeperOutfield
  const a = POS_GEOM[from], b = POS_GEOM[to]
  return Math.round(PENALTY.perDepth * Math.abs(a.depth - b.depth) + PENALTY.perSide * Math.abs(a.side - b.side))
}

export function penalty(player: Player, slot: Pos): number {
  const natural = rawPenalty(player.positions[0], slot)
  return player.positions.slice(1).includes(slot) ? Math.min(natural, PENALTY.secondaryMax) : natural
}

export const effectiveOvr = (player: Player, slot: Pos) => player.ovr - penalty(player, slot)

export type Line = 'GK' | 'DEF' | 'MID' | 'ATT'
export function lineOf(pos: Pos): Line {
  if (pos === 'GK') return 'GK'
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF'
  if (['LW', 'RW', 'ST'].includes(pos)) return 'ATT'
  return 'MID'
}
