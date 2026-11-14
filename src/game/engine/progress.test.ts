import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, apply, emptyProgress, levelOf, merge, paletteLevel, xpForLevel } from './progress'
import { summarise, type Ev } from '../../backend/track'

describe('progress', () => {
  it('levels up on a rising curve', () => {
    expect(levelOf(0)).toMatchObject({ level: 1, title: 'Sunday League', into: 0, need: 150 })
    expect(levelOf(149).level).toBe(1)
    expect(levelOf(150).level).toBe(2)
    expect(levelOf(xpForLevel(5)).level).toBe(5)
    expect(paletteLevel(0)).toBe(1)
    expect(paletteLevel(17)).toBe(8)
  })

  it('a first win earns XP, achievements and a level', () => {
    const { next, earned } = apply(emptyProgress(), { kind: 'game', mode: 'xi', players: 2, won: true, online: false, cpu: true })
    expect(next.stats).toMatchObject({ played: 1, won: 1, cpuWon: 1 })
    expect(earned.achievements.map((a) => a.id).sort()).toEqual(['beat-machine', 'goat', 'kickoff', 'silverware'])
    expect(earned.levelUp).toBeGreaterThan(1)
    // the same achievement never pays twice
    const again = apply(next, { kind: 'game', mode: 'xi', players: 2, won: true, online: false, cpu: true })
    expect(again.earned.achievements).toHaveLength(0)
  })

  it('daily streaks unlock streak badges', () => {
    let p = emptyProgress()
    for (let s = 1; s <= 7; s++) p = apply(p, { kind: 'daily', points: s === 7 ? 9 : 4, streak: s }).next
    expect(Object.keys(p.achievements)).toEqual(expect.arrayContaining(['daily-habit', 'hat-trick', 'week', 'flawless']))
    expect(p.stats.bestStreak).toBe(7)
  })

  it('every achievement is reachable and unique', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    const a = emptyProgress(), b = { ...emptyProgress(), xp: 10 }
    expect(merge(a, b)).toBe(b)
  })
})

describe('insights', () => {
  const ev = (device: string, at: string, name: string, props?: Record<string, unknown>, session = `${device}-${at.slice(0, 10)}`): Ev => ({ name, device, session, at, props })
  it('counts players, retention, funnels and drop-off', () => {
    const events = [
      ev('a', '2026-11-01T10:00:00Z', 'app_open'), ev('a', '2026-11-01T10:01:00Z', 'mode_start', { mode: 'xi' }),
      ev('a', '2026-11-01T10:20:00Z', 'game_done', { mode: 'xi' }), ev('a', '2026-11-01T10:21:00Z', 'session_end', { seconds: 1260, last: 'tournament' }),
      ev('a', '2026-11-02T09:00:00Z', 'app_open'), ev('a', '2026-11-02T09:05:00Z', 'daily_done', { points: 6 }),
      ev('b', '2026-11-01T12:00:00Z', 'app_open'), ev('b', '2026-11-01T12:01:00Z', 'mode_start', { mode: 'chaos' }),
      ev('b', '2026-11-01T12:03:00Z', 'session_end', { seconds: 180, last: 'formation' }),
    ]
    const s = summarise(events, '2026-11-12T00:00:00Z')
    expect(s.players).toBe(2)
    expect(s.d1).toBe(0.5) // a came back the next day, b didn't
    expect(s.d7).toBe(0)
    expect(s.modes).toEqual(expect.arrayContaining([{ mode: 'xi', started: 1, finished: 1 }, { mode: 'chaos', started: 1, finished: 0 }]))
    expect(s.dropOff).toEqual([{ screen: 'formation', sessions: 1 }])
    expect(s.avgMinutes).toBeCloseTo(12, 5)
    expect(s.dailyDraft).toEqual({ players: 1, avgPoints: 6 })
    expect(s.daily).toHaveLength(14)
  })
})
