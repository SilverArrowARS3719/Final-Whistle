import type { Pos } from './players'
import { lineOf } from '../engine/position'

export type Slot = { pos: Pos; x: number; y: number } // x 0-100 left→right, y 0-100 attack→own goal

const s = (pos: Pos, x: number, y: number): Slot => ({ pos, x, y })

// Slots are listed in draft pick order: GK, defence L→R, midfield L→R (deepest line first), attack L→R.
export const FORMATIONS: Record<string, Slot[]> = {
  '4-3-3': [
    s('GK', 50, 92),
    s('LB', 12, 72), s('CB', 37, 76), s('CB', 63, 76), s('RB', 88, 72),
    s('CM', 28, 50), s('CDM', 50, 58), s('CM', 72, 50),
    s('LW', 15, 22), s('ST', 50, 14), s('RW', 85, 22),
  ],
  '4-4-2': [
    s('GK', 50, 92),
    s('LB', 12, 72), s('CB', 37, 76), s('CB', 63, 76), s('RB', 88, 72),
    s('LM', 12, 46), s('CM', 37, 52), s('CM', 63, 52), s('RM', 88, 46),
    s('ST', 37, 16), s('ST', 63, 16),
  ],
  '3-5-2': [
    s('GK', 50, 92),
    s('CB', 25, 75), s('CB', 50, 78), s('CB', 75, 75),
    s('CDM', 37, 58), s('CDM', 63, 58), s('LM', 10, 44), s('CAM', 50, 36), s('RM', 90, 44),
    s('ST', 37, 15), s('ST', 63, 15),
  ],
  '4-2-3-1': [
    s('GK', 50, 92),
    s('LB', 12, 72), s('CB', 37, 76), s('CB', 63, 76), s('RB', 88, 72),
    s('CDM', 37, 58), s('CDM', 63, 58), s('LM', 14, 36), s('CAM', 50, 34), s('RM', 86, 36),
    s('ST', 50, 14),
  ],
  '3-4-3': [
    s('GK', 50, 92),
    s('CB', 25, 75), s('CB', 50, 78), s('CB', 75, 75),
    s('LM', 10, 48), s('CM', 37, 54), s('CM', 63, 54), s('RM', 90, 48),
    s('LW', 18, 22), s('ST', 50, 14), s('RW', 82, 22),
  ],
}

export const FORMATION_NAMES = Object.keys(FORMATIONS)

// Small-sided shapes (Auction mode only), in pick order.
export const SMALL_SIDED: Record<5 | 7, Slot[]> = {
  5: [s('GK', 50, 92), s('CB', 50, 72), s('CM', 30, 48), s('CM', 70, 48), s('ST', 50, 18)],
  7: [s('GK', 50, 92), s('CB', 35, 74), s('CB', 65, 74), s('LM', 14, 46), s('CM', 50, 50), s('RM', 86, 46), s('ST', 50, 16)],
}

// ---- custom formations: typed as lines from the back, e.g. "4-2-3-1" ----
type Out = Exclude<Pos, 'GK'>
const DEF: Record<number, Out[]> = { 1: ['CB'], 2: ['CB', 'CB'], 3: ['CB', 'CB', 'CB'], 4: ['LB', 'CB', 'CB', 'RB'], 5: ['LWB', 'CB', 'CB', 'CB', 'RWB'] }
const ATT: Record<number, Out[]> = { 1: ['ST'], 2: ['ST', 'ST'], 3: ['LW', 'ST', 'RW'], 4: ['LW', 'ST', 'ST', 'RW'], 5: ['LW', 'ST', 'ST', 'ST', 'RW'] }
const MID: Record<number, Out[]> = { 1: ['CDM'], 2: ['CM', 'CM'], 3: ['CM', 'CDM', 'CM'], 4: ['LM', 'CM', 'CM', 'RM'], 5: ['LM', 'CM', 'CDM', 'CM', 'RM'] }
const HOLD: Record<number, Out[]> = { 1: ['CDM'], 2: ['CDM', 'CDM'], 3: ['CDM', 'CDM', 'CDM'], 4: ['LM', 'CDM', 'CDM', 'RM'], 5: ['LM', 'CDM', 'CDM', 'CDM', 'RM'] }
const ATTMID: Record<number, Out[]> = { 1: ['CAM'], 2: ['CAM', 'CAM'], 3: ['LM', 'CAM', 'RM'], 4: ['LM', 'CAM', 'CAM', 'RM'], 5: ['LM', 'CAM', 'CAM', 'CAM', 'RM'] }
const LINE_ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3 }

// Parses a typed shape. Returns slots in pick order (GK, defence, midfield, attack; each left to right) or an error to show.
export function shapeFormation(text: string): { slots: Slot[]; label: string } | { error: string } {
  const parts = text.trim().split(/\s*[-\s]\s*/).filter(Boolean)
  if (!parts.length) return { error: 'Type a shape like 4-4-2.' }
  if (!parts.every((p) => /^\d$/.test(p))) return { error: 'Use single numbers separated by dashes, like 4-2-3-1.' }
  const n = parts.map(Number)
  if (n.length < 2 || n.length > 5) return { error: 'Use 2 to 5 lines, like 3-5-2 or 4-1-2-1-2.' }
  if (n.some((x) => x < 1 || x > 5)) return { error: 'Each line needs 1 to 5 players.' }
  const total = n.reduce((a, b) => a + b, 0)
  if (total !== 10) return { error: `That's ${total} outfield players. It must add up to exactly 10 (${total < 10 ? `${10 - total} short` : `${total - 10} too many`}).` }
  const mids = n.slice(1, -1)
  const lines: Out[][] = [DEF[n[0]], ...mids.map((m, k) => (mids.length === 1 ? MID[m] : k === 0 ? HOLD[m] : k === mids.length - 1 ? ATTMID[m] : MID[m])), ATT[n[n.length - 1]]]
  const out: Slot[] = []
  lines.forEach((line, li) => {
    const y = 76 - (li * 60) / (lines.length - 1)
    const span = line.length >= 4 ? 76 : line.length === 3 ? 52 : 30
    line.forEach((pos, k) => out.push(s(pos, line.length === 1 ? 50 : 50 - span / 2 + (span * k) / (line.length - 1), y)))
  })
  out.sort((a, b) => LINE_ORDER[lineOf(a.pos)] - LINE_ORDER[lineOf(b.pos)] || a.x - b.x || b.y - a.y)
  return { slots: [s('GK', 50, 92), ...out], label: n.join('-') }
}

export function formationLabel(slots: Slot[]): string {
  const n = (l: string) => slots.filter((x) => lineOf(x.pos) === l).length
  return `${n('DEF')}-${n('MID')}-${n('ATT')}`
}

/** Neighbouring slots as index pairs: the link lines drawn between players on the pitch. */
export function linkEdges(slots: Slot[]): [number, number][] {
  const d = (a: Slot, b: Slot) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.25) // the pitch is taller than wide
  const near = slots.map((s, i) => slots.map((t, j) => ({ j, d: d(s, t) })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).map((o) => o.j))
  const edges: [number, number][] = []
  // everyone joins their two nearest; a third only when it is close, so no slot becomes a hub
  const linked = (i: number, j: number) => near[i].indexOf(j) < 2 || (near[i].indexOf(j) < 3 && d(slots[i], slots[j]) < 40)
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      if (linked(i, j) || linked(j, i)) edges.push([i, j])
  return edges
}
