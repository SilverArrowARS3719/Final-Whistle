import { describe, expect, it } from 'vitest'
import { COMPETITIONS, TEAMS, WINNER_PLAYERS, squadOf } from '../data/winners'
import { FORMATIONS } from '../data/formations'
import { careerWinner, hasSet, simulateCareer, simulateSeason, strength, trophiesOf } from './career'
import { CAREER } from './config'
import { drafterAt, newTeam } from './draft'
import { makeRng } from './rng'
import { BENCH_SLOTS, ROUNDS, canPlay, eligible, spinFor, type SlotPick } from './winners'

// two to four bots draft full 20-man squads with the real rules
function botDraft(n: number, seed: number) {
  const rng = makeRng(seed)
  const teams = Array.from({ length: n }, (_, i) => newTeam(`Bot ${i} FC`, '4-4-2'))
  const bench: (typeof WINNER_PLAYERS)[number][][] = teams.map(() => [])
  const taken = new Set<number>()
  const order = Array.from({ length: n }, (_, i) => i)
  for (let r = 0; r < ROUNDS; r++) {
    const landed: { team: string; by: number }[] = []
    for (let k = 0; k < n; k++) {
      const ti = drafterAt(r * n + k, order)
      const t = teams[ti]
      const open = t.picks.findIndex((p) => !p)
      const slot: SlotPick = open >= 0 ? { kind: 'xi', i: open, pos: FORMATIONS['4-4-2'][open].pos } : { kind: 'bench', i: bench[ti].length }
      const { comp } = spinFor(slot, taken, landed.filter((l) => l.by !== ti).map((l) => l.team), rng)
      expect(comp).not.toBeNull()
      landed.push({ team: comp!.winner, by: ti })
      const p = eligible(comp!.winner, slot, taken)[0]
      expect(taken.has(p.id)).toBe(false)
      taken.add(p.id)
      if (slot.kind === 'xi') t.picks[slot.i] = p
      else bench[ti].push(p)
    }
    // nobody got a club someone else got in the same round
    const byClub = new Map<string, Set<number>>()
    for (const l of landed) byClub.set(l.team, (byClub.get(l.team) ?? new Set()).add(l.by))
    for (const who of byClub.values()) expect(who.size).toBe(1)
  }
  teams.forEach((t, i) => { t.bench = bench[i] })
  return teams
}

describe('team of winners data', () => {
  it('every competition has a winner with a squad, and every squad can fill each line', () => {
    expect(COMPETITIONS.length).toBe(42)
    for (const c of COMPETITIONS) {
      expect(TEAMS[c.winner], c.id).toBeDefined()
      const squad = squadOf(c.winner)
      expect(squad.length, c.winner).toBeGreaterThanOrEqual(18)
      for (const pos of ['GK', 'CB', 'CM', 'ST'] as const)
        expect(squad.some((p) => canPlay(p, { kind: 'xi', i: 0, pos })), `${c.winner} ${pos}`).toBe(true)
    }
  })
  it('a player in a club and a national squad is one player', () => {
    const yamal = squadOf('barcelona').find((p) => p.name === 'Lamine Yamal')!
    expect(squadOf('spain')).toContain(yamal)
    expect(squadOf('portugal')).toContain(squadOf('psg').find((p) => p.name === 'Vitinha'))
    for (const id of Object.keys(TEAMS)) expect(new Set(squadOf(id).map((p) => p.name)).size, id).toBe(squadOf(id).length)
    expect(new Set(WINNER_PLAYERS.map((p) => p.id)).size).toBe(WINNER_PLAYERS.length)
    expect(WINNER_PLAYERS.every((p) => p.id >= 10_000)).toBe(true)
  })
})

describe('team of winners draft', () => {
  it('bots draft 300 full games with no dead ends, no repeats, no same-round club clashes', () => {
    for (let d = 0; d < 300; d++) {
      const teams = botDraft(2 + (d % 3), d + 1)
      for (const t of teams) {
        expect(t.picks.every(Boolean)).toBe(true)
        expect(t.bench.length).toBe(BENCH_SLOTS)
      }
    }
  })
})

describe('team of winners career', () => {
  it('is identical from the same seed', () => {
    const [t] = botDraft(2, 7)
    expect(JSON.stringify(simulateCareer(t, 42))).toBe(JSON.stringify(simulateCareer(t, 42)))
    const s = simulateSeason(t, 1, null, 9)
    expect(s.table).toHaveLength(20)
    expect(s.table.every((r) => r.p === 38)).toBe(true)
  })
  it('a drafted squad wins things sometimes, the full set rarely', () => {
    let seasons = 0, league = 0, ucl = 0, sets = 0, careers = 0, str = 0
    for (let d = 0; d < 150; d++) {
      for (const t of botDraft(2, 1000 + d)) {
        const c = simulateCareer(t, d * 31 + 5)
        careers++; str += strength(t)
        seasons += c.length
        league += c.filter((s) => s.trophies.includes('pl')).length
        ucl += c.filter((s) => s.trophies.includes('ucl')).length
        if (hasSet(c)) sets++
      }
    }
    const r = { strength: str / careers, league: league / seasons, ucl: ucl / seasons, set: sets / careers }
    console.log('career', r)
    expect(r.league).toBeGreaterThan(0.25)
    expect(r.league).toBeLessThan(0.55)
    expect(r.ucl).toBeGreaterThan(0.1)
    expect(r.ucl).toBeLessThan(0.3)
    expect(r.set).toBeGreaterThan(0.02)
    expect(r.set).toBeLessThan(0.12)
  })
  it('win rule: full set beats more trophies; otherwise most trophies', () => {
    const fake = (trophies: string[][], pts = 80) => trophies.map((t, i) => ({ season: i + 1, trophies: t, table: [{ name: 'x', you: true, pts }] })) as never
    const set = fake([['pl', 'fa', 'efl'], ['shield', 'ucl'], ['super']])
    const many = fake([['pl', 'fa', 'efl'], ['pl', 'fa', 'efl'], ['pl', 'fa', 'efl']])
    expect(careerWinner([many, set], 3)).toEqual({ winner: 1, how: 'set', season: 3 })
    expect(careerWinner([many, fake([['pl'], [], []])], 3)).toEqual({ winner: 0, how: 'most', season: 3 })
    expect(careerWinner([many, fake([['pl'], [], []])], 2)).toBeNull()
    expect(trophiesOf(set)).toHaveLength(6)
    expect(CAREER.seasons).toBe(3)
  })
})
