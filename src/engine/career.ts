// Team of Winners: three English seasons per drafted club, each club in its own world.
// Everything is deterministic from a seed so every device in an online game sees the same career.
import type { Player, Pos } from '../data/players'
import { FORMATIONS } from '../data/formations'
import { EUROPA_WINNERS, EUROPE_POOL, LOWER, PREMIER_LEAGUE } from '../data/winners/opponents'
import { TEAMS, squadOf } from '../data/winners'
import { chemBoosts } from './chemistry'
import { CAREER } from './config'
import { doubledIds, newTeam, slotsOf, type Team } from './draft'
import { effectiveOvr } from './position'
import { makeRng, pick, shuffle, type Rng } from './rng'
import { simulateMatch } from './sim'

export const TROPHIES = ['pl', 'fa', 'efl', 'shield', 'ucl', 'super'] as const
export type Trophy = (typeof TROPHIES)[number]
export type Cup = Exclude<Trophy, 'pl'>
export const TROPHY_NAME: Record<Trophy, string> = {
  pl: 'Premier League', fa: 'FA Cup', efl: 'Carabao Cup', shield: 'Community Shield', ucl: 'Champions League', super: 'UEFA Super Cup',
}

export type Tie = { round: string; opp: string; oppOvr: number; score: [number, number]; pens?: [number, number]; won: boolean; seed?: number; aggregate?: boolean }
export type Row = { name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; you?: boolean }
export type SeasonResult = {
  season: number
  strength: number
  table: Row[]
  position: number
  cups: Partial<Record<Cup, Tie[]>> // only competitions you entered
  uclPhase?: { pts: number; games: Tie[] }
  trophies: Trophy[]
  faWinner: string // who lifted the FA Cup (for next season's Community Shield)
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1)

/** Team rating: XI effective OVR with chemistry, a little lower when the bench is thin. */
export function strength(team: Team) {
  const slots = slotsOf(team)
  const chem = chemBoosts(team.picks, doubledIds(team))
  const xi = avg(team.picks.map((p, i) => (p ? effectiveOvr(p, slots[i].pos) + chem[i] : 45))) + (team.boost ?? 0)
  const bench = team.bench.length ? avg([...team.bench].sort((a, b) => b.ovr - a.ovr).slice(0, 7).map((p) => p.ovr)) : xi - 12
  return xi - CAREER.depthWeight * Math.max(0, xi - bench)
}

function poisson(lambda: number, rng: Rng) {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= rng() } while (p > L)
  return k - 1
}

/** 90 minutes from two ratings. `home` > 0 favours a. */
export function quickMatch(a: number, b: number, rng: Rng, home = 0): [number, number] {
  const gap = (a - b + home) * CAREER.gapK / 2
  return [poisson(CAREER.goalBase * Math.exp(gap), rng), poisson(CAREER.goalBase * Math.exp(-gap), rng)]
}

// a level knockout tie goes to penalties, nudged a little by quality
function shootout(a: number, b: number, rng: Rng): [number, number] {
  const aWins = rng() < 0.5 + Math.max(-0.15, Math.min(0.15, (a - b) * 0.01))
  const lose = 2 + Math.floor(rng() * 3)
  return aWins ? [lose + 1, lose] : [lose, lose + 1]
}
function singleTie(round: string, you: number, opp: [string, number], rng: Rng): Tie {
  const score = quickMatch(you, opp[1], rng)
  if (score[0] === score[1]) { const et = quickMatch(you, opp[1], rng); score[0] += Math.round(et[0] / 3); score[1] += Math.round(et[1] / 3) }
  const pens = score[0] === score[1] ? shootout(you, opp[1], rng) : undefined
  return { round, opp: opp[0], oppOvr: Math.round(opp[1]), score, pens, won: pens ? pens[0] > pens[1] : score[0] > score[1] }
}
function twoLegs(round: string, you: number, opp: [string, number], rng: Rng): Tie {
  const a = quickMatch(you, opp[1], rng, CAREER.homeEdge), b = quickMatch(you, opp[1], rng, -CAREER.homeEdge)
  const score: [number, number] = [a[0] + b[0], a[1] + b[1]]
  const pens = score[0] === score[1] ? shootout(you, opp[1], rng) : undefined
  return { round, opp: opp[0], oppOvr: Math.round(opp[1]), score, pens, won: pens ? pens[0] > pens[1] : score[0] > score[1], aggregate: true }
}

/** A real winners squad when we have one (so a watched final has real names), otherwise a generic side of that rating. */
export function opponentTeam(name: string, ovr: number): Team {
  const real = Object.values(TEAMS).find((t) => t.name === name)
  const t = newTeam(name, '4-4-2')
  const slots = FORMATIONS['4-4-2']
  if (real) {
    const pool = [...squadOf(real.id)]
    t.picks = slots.map((s) => {
      const best = pool.sort((a, b) => effectiveOvr(b, s.pos) - effectiveOvr(a, s.pos))[0]
      pool.splice(pool.indexOf(best), 1)
      return best
    })
    t.bench = pool.sort((a, b) => b.ovr - a.ovr).slice(0, 7)
    t.boost = Math.round(ovr - strength(t)) // play at this season's rating, real names
    return t
  }
  let n = -1
  const fake = (pos: Pos, o: number, no: number): Player => ({ id: n--, name: `${name} #${no}`, ovr: Math.round(o), positions: [pos], nation: name, clubs: [], leagues: [], era: '20s', wc: false })
  const NUMBERS = [1, 3, 5, 6, 2, 11, 8, 4, 7, 9, 10]
  t.picks = slots.map((s, i) => fake(s.pos, ovr, NUMBERS[i]))
  t.bench = (['GK', 'CB', 'LB', 'CM', 'CM', 'RW', 'ST'] as Pos[]).map((p, i) => fake(p, ovr - 5, 12 + i))
  return t
}
function final(round: string, club: Team, opp: [string, number], rng: Rng): Tie {
  const seed = Math.floor(rng() * 2 ** 31)
  const m = simulateMatch(club, opponentTeam(opp[0], opp[1]), seed)
  return { round, opp: opp[0], oppOvr: opp[1], score: m.score, pens: m.pens ?? undefined, won: m.winner === 0, seed } // exact rating: replays rebuild the same side
}

// play a knockout path; stops at the first defeat
function cupRun(rounds: [string, (used: Set<string>) => [string, number], 'single' | 'legs' | 'final'][], club: Team, you: number, rng: Rng) {
  const ties: Tie[] = []
  const used = new Set<string>()
  for (const [round, draw, kind] of rounds) {
    const opp = draw(used)
    used.add(opp[0])
    const tie = kind === 'final' ? final(round, club, opp, rng) : kind === 'legs' ? twoLegs(round, you, opp, rng) : singleTie(round, you, opp, rng)
    ties.push(tie)
    if (!tie.won) break
  }
  return ties
}

export function simulateSeason(club: Team, season: number, prev: SeasonResult | null, seed: number): SeasonResult {
  const rng = makeRng(seed)
  const you = strength(club)
  const wobble = () => (rng() + rng() + rng() - 1.5) * CAREER.formSpread * 2 + CAREER.oppOffset
  const pl: [string, number][] = PREMIER_LEAGUE.map(([n, o]) => [n, o + wobble()])
  const lower: [string, number][] = LOWER.map(([n, o]) => [n, o + wobble()])
  const europe: [string, number][] = EUROPE_POOL.map(([n, o]) => [n, o + wobble()])
  const ranked = (pool: [string, number][]) => [...pool].sort((a, b) => b[1] - a[1])
  // draw from the strongest `top` sides not met yet in this cup
  const from = (pool: [string, number][], top: number) => (used: Set<string>) => pick(rng, ranked(pool).filter(([n]) => !used.has(n)).slice(0, top))

  // ---- league: double round robin
  const sides: [string, number][] = [[club.name, you], ...pl]
  const rows: Row[] = sides.map(([name], i) => ({ name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, you: i === 0 || undefined }))
  for (let i = 0; i < sides.length; i++) for (let j = 0; j < sides.length; j++) {
    if (i === j) continue
    const [gi, gj] = quickMatch(sides[i][1], sides[j][1], rng, CAREER.homeEdge)
    for (const [r, f, a] of [[rows[i], gi, gj], [rows[j], gj, gi]] as const) {
      r.p++; r.gf += f; r.ga += a
      if (f > a) { r.w++; r.pts += 3 } else if (f === a) { r.d++; r.pts++ } else r.l++
    }
  }
  const table = [...rows].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
  const position = table.findIndex((r) => r.you) + 1

  const cups: SeasonResult['cups'] = {}
  // ---- curtain raisers
  const wonPrev = (t: Trophy) => !!prev?.trophies.includes(t)
  const strengthOf = (name: string): [string, number] => pl.find(([n]) => n === name) ?? [name, 82]
  if (season === 1) cups.shield = [final('Community Shield', club, strengthOf('Arsenal'), rng)]
  else if (prev && (wonPrev('pl') || wonPrev('fa'))) {
    const opp = wonPrev('pl') && wonPrev('fa') ? prev.table.find((r) => !r.you)!.name : wonPrev('pl') ? prev.faWinner : prev.table[0].name
    cups.shield = [final('Community Shield', club, strengthOf(opp), rng)]
  }
  if (wonPrev('ucl')) cups.super = [final('UEFA Super Cup', club, ((o) => [o[0], o[1] + CAREER.oppOffset] as [string, number])(pick(rng, EUROPA_WINNERS)), rng)]

  // ---- domestic cups
  const english = [...pl, ...lower]
  cups.fa = cupRun([
    ['Third round', from(english, 44), 'single'], ['Fourth round', from(english, 36), 'single'], ['Fifth round', from(english, 26), 'single'],
    ['Quarter-final', from(english, 16), 'single'], ['Semi-final', from(pl, 10), 'single'], ['Final', from(pl, 6), 'final'],
  ], club, you, rng)
  cups.efl = cupRun([
    ['Third round', from(english, 44), 'single'], ['Fourth round', from(english, 30), 'single'], ['Quarter-final', from(english, 20), 'single'],
    ['Semi-final', from(pl, 10), 'legs'], ['Final', from(pl, 6), 'final'],
  ], club, you, rng)
  const faWinner = cups.fa.at(-1)?.round === 'Final' && cups.fa.at(-1)!.won ? club.name : pick(rng, ranked(pl).slice(0, 6))[0]

  // ---- Champions League: 8-game league phase, then knockouts
  let uclPhase: SeasonResult['uclPhase']
  if (season === 1 || (prev && prev.position <= CAREER.uclQualify)) {
    const pots = [0, 1, 2, 3].map((k) => ranked(europe).slice(k * 10, k * 10 + 10))
    const opps = pots.flatMap((pot) => shuffle(rng, pot).slice(0, 2))
    const games: Tie[] = opps.map(([n, o], k) => {
      const score = quickMatch(you, o, rng, k % 2 ? -CAREER.homeEdge : CAREER.homeEdge)
      return { round: 'League phase', opp: n, oppOvr: Math.round(o), score, won: score[0] > score[1] }
    })
    const pts = games.reduce((s, g) => s + (g.score[0] > g.score[1] ? 3 : g.score[0] === g.score[1] ? 1 : 0), 0)
    uclPhase = { pts, games }
    if (pts >= CAREER.uclPlayoff) {
      const top = ranked(europe)
      const rounds: [string, (u: Set<string>) => [string, number], 'single' | 'legs' | 'final'][] = [
        ['Round of 16', from(top, 24), 'legs'], ['Quarter-final', from(top, 14), 'legs'], ['Semi-final', from(top, 8), 'legs'], ['Final', from(top, 4), 'final'],
      ]
      if (pts < CAREER.uclDirect) rounds.unshift(['Knockout play-off', (u) => pick(rng, top.slice(8, 24).filter(([n]) => !u.has(n))), 'legs'])
      cups.ucl = cupRun(rounds, club, you, rng)
    } else cups.ucl = []
  }

  const trophies: Trophy[] = []
  if (position === 1) trophies.push('pl')
  for (const [k, ties] of Object.entries(cups) as [Cup, Tie[]][]) {
    const last = ties.at(-1)
    if (last?.won && (last.round === 'Final' || k === 'shield' || k === 'super')) trophies.push(k)
  }
  return { season, strength: Math.round(you * 10) / 10, table, position, cups, uclPhase, trophies, faWinner }
}

/** Seasons 1..upTo for one club. */
export function simulateCareer(club: Team, seed: number, upTo = CAREER.seasons): SeasonResult[] {
  const out: SeasonResult[] = []
  for (let s = 1; s <= upTo; s++) out.push(simulateSeason(club, s, out.at(-1) ?? null, seed + s * 7919))
  return out
}

export const trophiesOf = (career: SeasonResult[]) => career.flatMap((s) => s.trophies)
export const hasSet = (career: SeasonResult[]) => TROPHIES.every((t) => trophiesOf(career).includes(t))
const leaguePts = (career: SeasonResult[]) => career.reduce((s, x) => s + x.table.find((r) => r.you)!.pts, 0)

export type Verdict = { winner: number; how: 'set' | 'most'; season: number } | null

/** First to complete the set wins (checked season by season); after the last season, most trophies. */
export function careerWinner(careers: SeasonResult[][], seasonsPlayed: number, final = seasonsPlayed >= CAREER.seasons): Verdict {
  const rank = (ids: number[], upTo: number) => [...ids].sort((a, b) => {
    const ca = careers[a].slice(0, upTo), cb = careers[b].slice(0, upTo)
    return trophiesOf(cb).length - trophiesOf(ca).length
      || trophiesOf(cb).filter((t) => t === 'pl').length - trophiesOf(ca).filter((t) => t === 'pl').length
      || leaguePts(cb) - leaguePts(ca)
  })[0]
  for (let s = 1; s <= seasonsPlayed; s++) {
    const done = careers.map((c, i) => [c, i] as const).filter(([c]) => hasSet(c.slice(0, s))).map(([, i]) => i)
    if (done.length) return { winner: rank(done, s), how: 'set', season: s }
  }
  return final ? { winner: rank(careers.map((_, i) => i), seasonsPlayed), how: 'most', season: seasonsPlayed } : null
}
