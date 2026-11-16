import { shuffle, type Rng } from './rng'

export type Fixture = { a: number; b: number; stage: string; score?: [number, number]; pens?: [number, number] | null; winner?: number }

/** The formats players can pick: head to head, round robin, or a knockout of four or eight. */
export const PLAYER_COUNTS = [2, 3, 4, 8] as const

// Knockout rounds by how many teams are left in them.
const ROUND = { 8: 'Quarter-final', 4: 'Semi-final', 2: 'Final' } as Record<number, string>
const roundOf = (teams: number[]): Fixture[] =>
  teams.length === 2 ? [{ a: teams[0], b: teams[1], stage: 'Final' }]
    : Array.from({ length: teams.length / 2 }, (_, k) => ({ a: teams[2 * k], b: teams[2 * k + 1], stage: `${ROUND[teams.length]} ${k + 1}` }))

// 2 players: one match. 3: round robin. 4 or 8: random knockout draw; each round is added once the last one is done.
export function makeFixtures(n: number, rng: Rng): Fixture[] {
  if (n === 3) return [{ a: 0, b: 1, stage: 'Round 1' }, { a: 1, b: 2, stage: 'Round 2' }, { a: 0, b: 2, stage: 'Round 3' }]
  return roundOf(shuffle(rng, Array.from({ length: n }, (_, i) => i)))
}

export function nextFixtures(n: number, fixtures: Fixture[]): Fixture[] {
  if (n === 3 || !fixtures.every((f) => f.winner !== undefined) || fixtures.some((f) => f.stage === 'Final')) return fixtures
  const size = Object.entries(ROUND).find(([, name]) => fixtures.at(-1)!.stage.startsWith(name))![0]
  const winners = fixtures.filter((f) => f.stage.startsWith(ROUND[+size])).map((f) => f.winner!)
  return [...fixtures, ...roundOf(winners)]
}

export type Row = { team: number; p: number; w: number; l: number; gf: number; ga: number; pts: number }

// Win 3, loss 0. Tiebreak: goal difference, then goals scored. Shootout goals don't count.
export function standings(n: number, fixtures: Fixture[]): Row[] {
  const rows: Row[] = Array.from({ length: n }, (_, team) => ({ team, p: 0, w: 0, l: 0, gf: 0, ga: 0, pts: 0 }))
  for (const f of fixtures) {
    if (!f.score || f.winner === undefined) continue
    const [A, B] = [rows[f.a], rows[f.b]]
    A.p++; B.p++
    A.gf += f.score[0]; A.ga += f.score[1]
    B.gf += f.score[1]; B.ga += f.score[0]
    const [W, L] = f.winner === f.a ? [A, B] : [B, A]
    W.w++; W.pts += 3; L.l++
  }
  return rows.sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf)
}

export function champion(n: number, fixtures: Fixture[]): number | null {
  if (!fixtures.every((f) => f.winner !== undefined)) return null
  if (n === 3) return standings(n, fixtures)[0].team
  const final = fixtures.find((f) => f.stage === 'Final')
  return final?.winner ?? null
}
