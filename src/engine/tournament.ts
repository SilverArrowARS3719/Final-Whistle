import { shuffle, type Rng } from './rng'

export type Fixture = { a: number; b: number; stage: string; score?: [number, number]; pens?: [number, number] | null; winner?: number }

// 2 players: one match. 3: round robin. 4: random semi draw, final added once semis are done.
export function makeFixtures(n: number, rng: Rng): Fixture[] {
  if (n === 2) return [{ a: 0, b: 1, stage: 'Final' }]
  if (n === 3) return [{ a: 0, b: 1, stage: 'Round 1' }, { a: 1, b: 2, stage: 'Round 2' }, { a: 0, b: 2, stage: 'Round 3' }]
  const d = shuffle(rng, [0, 1, 2, 3])
  return [{ a: d[0], b: d[1], stage: 'Semi-final 1' }, { a: d[2], b: d[3], stage: 'Semi-final 2' }]
}

export function nextFixtures(n: number, fixtures: Fixture[]): Fixture[] {
  if (n === 4 && fixtures.length === 2 && fixtures.every((f) => f.winner !== undefined))
    return [...fixtures, { a: fixtures[0].winner!, b: fixtures[1].winner!, stage: 'Final' }]
  return fixtures
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
