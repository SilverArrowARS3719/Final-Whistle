import { describe, expect, it } from 'vitest'
import { currentSeason, daysLeft, seasonEnds, type Season } from './seasons'

const league = (daysAgo: number): Season => ({ id: 'x', code: 'ABC123', name: 'Sunday League', owner: 'o', starts_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(), ends_at: 'infinity' })

describe('league seasons', () => {
  it('a new league is in season 1 with about a year to go', () => {
    expect(currentSeason(league(0))).toBe(1)
    expect(daysLeft(league(0))).toBeGreaterThanOrEqual(365)
    expect(daysLeft(league(300))).toBe(66)
  })
  it('rolls into season 2 after a year, and keeps counting', () => {
    expect(currentSeason(league(366))).toBe(2)
    expect(currentSeason(league(365 * 3 + 10))).toBe(4)
    const l = league(400)
    expect(seasonEnds(l, 1).getTime()).toBeLessThan(Date.now())
    expect(seasonEnds(l).getTime()).toBeGreaterThan(Date.now())
  })
})
