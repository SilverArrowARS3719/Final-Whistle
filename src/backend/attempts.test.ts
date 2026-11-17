import { beforeEach, describe, expect, it } from 'vitest'
import { clearMisses, lockedFor, recordMiss, waitAfter } from './attempts'

const mem = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) } as Storage })

describe('login attempt limit', () => {
  beforeEach(() => clearMisses())

  it('allows five misses, then makes you wait, doubling each time up to 15 minutes', () => {
    expect([1, 4].map(waitAfter)).toEqual([0, 0])
    expect([5, 6, 7].map(waitAfter)).toEqual([30_000, 60_000, 120_000])
    expect(waitAfter(30)).toBe(15 * 60_000)
  })

  it('locks after the fifth miss and unlocks when the wait is over', () => {
    for (let i = 0; i < 4; i++) recordMiss(1000)
    expect(lockedFor(1000)).toBe(0)
    recordMiss(1000)
    expect(lockedFor(1000)).toBe(30_000)
    expect(lockedFor(31_000)).toBe(0)
    clearMisses()
    expect(lockedFor(1000)).toBe(0)
  })
})
