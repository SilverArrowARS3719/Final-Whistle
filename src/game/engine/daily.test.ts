import { describe, expect, it } from 'vitest'
import { FORMATIONS } from '../data/formations'
import { addDays, bestRating, bestStreakOf, dailyFor, dailyNumber, playDaily, RULES, shareText, streakOf, OPTIONS, type DayRecord } from './daily'
import { effectiveOvr } from './position'

const DAYS = Array.from({ length: 60 }, (_, i) => addDays('2026-11-12', i))

describe('daily draft', () => {
  it('numbers days from launch', () => {
    expect(dailyNumber('2026-11-12')).toBe(1)
    expect(dailyNumber('2026-12-12')).toBe(31)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('is identical for everyone on the same day', () => {
    const a = dailyFor('2026-11-20'), b = dailyFor('2026-11-20')
    expect(a.rounds.map((r) => r.map((p) => p.id))).toEqual(b.rounds.map((r) => r.map((p) => p.id)))
    expect(a.formation).toBe(b.formation)
  })

  it('gives three distinct, playable options every round for 60 days', () => {
    for (const key of DAYS) {
      const d = dailyFor(key)
      const slots = FORMATIONS[d.formation]
      expect(d.rounds).toHaveLength(11)
      const ids = d.rounds.flat().map((p) => p.id)
      expect(new Set(ids).size).toBe(11 * OPTIONS)
      d.rounds.forEach((opts, i) => opts.forEach((p) => expect(effectiveOvr(p, slots[i].pos)).toBeGreaterThan(p.ovr - 6)))
      // opponents are real legends sides and never share a player with your options
      const opp = d.opponents.flatMap((o) => o.picks.map((p) => p!.id))
      expect(opp.some((id) => ids.includes(id))).toBe(false)
      expect(d.opponents).toHaveLength(3)
    }
  })

  it('every rule shows up and has a description', () => {
    const seen = new Set(DAYS.map((k) => dailyFor(k).rule.id))
    for (const r of RULES) expect(r.desc.length).toBeGreaterThan(5)
    expect(seen.size).toBeGreaterThan(RULES.length / 2)
  })

  it('scores 0-9, and picking the best options usually beats picking the worst', () => {
    let best = 0, worst = 0
    for (const key of DAYS.slice(0, 30)) {
      const d = dailyFor(key)
      const slots = FORMATIONS[d.formation]
      const sorted = d.rounds.map((o, i) => [...o].sort((a, b) => effectiveOvr(b, slots[i].pos) - effectiveOvr(a, slots[i].pos)))
      const top = playDaily(d, sorted.map((o) => o[0]))
      const low = playDaily(d, sorted.map((o) => o[o.length - 1]))
      expect(top.points).toBeGreaterThanOrEqual(0)
      expect(top.points).toBeLessThanOrEqual(9)
      expect(top.rating).toBeCloseTo(bestRating(d), 5)
      best += top.points; worst += low.points
    }
    expect(best).toBeGreaterThan(worst)
    // the best picks should land around 5-7 on average: hard to get 9, not hopeless
    expect(best / 30).toBeGreaterThan(4)
    expect(best / 30).toBeLessThan(8)
    expect(worst / 30).toBeLessThan(best / 30 - 1)
  })

  it('same picks, same result', () => {
    const d = dailyFor('2026-11-15')
    const picks = d.rounds.map((o) => o[1])
    expect(playDaily(d, picks)).toEqual(playDaily(d, picks))
  })

  it('counts streaks', () => {
    const done: DayRecord = { picks: [], result: { points: 5, gf: 3, ga: 2, rating: 85, outcomes: ['W', 'L', 'WP'], scores: [[1, 0], [0, 1], [2, 2]], pens: [null, null, [4, 3]] } }
    const h = { '2026-11-10': done, '2026-11-11': done, '2026-11-12': done, '2026-11-08': done }
    expect(streakOf(h, '2026-11-12')).toBe(3)
    expect(streakOf(h, '2026-11-13')).toBe(3) // today not played yet: streak still alive
    expect(streakOf(h, '2026-11-14')).toBe(0)
    expect(bestStreakOf(h)).toBe(3)
    expect(shareText(dailyFor('2026-11-12'), done.result!, 3)).toContain('🔥 3-day streak')
  })
})

describe('link lines', () => {
  it('every slot is joined to a neighbour, and no slot is a hub', async () => {
    const { linkEdges, FORMATIONS: F, SMALL_SIDED } = await import('../data/formations')
    for (const slots of [...Object.values(F), ...Object.values(SMALL_SIDED)]) {
      const edges = linkEdges(slots)
      const degree = slots.map((_, i) => edges.filter((e) => e.includes(i)).length)
      expect(Math.min(...degree)).toBeGreaterThanOrEqual(2)
      expect(Math.max(...degree)).toBeLessThanOrEqual(6)
    }
  })
})
