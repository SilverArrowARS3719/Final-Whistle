import { describe, expect, it } from 'vitest'
import { askDue } from './feedback'

const DAY = 86_400_000
const fresh = { last: 0, games: 0, never: false }

describe('feedback nudge', () => {
  it('waits for the third finished game', () => {
    expect(askDue(fresh, 2)).toBe(false)
    expect(askDue(fresh, 3)).toBe(true)
  })
  it('then needs 10 days and 5 more games', () => {
    const asked = { last: 1000, games: 3, never: false }
    expect(askDue(asked, 20, 1000 + 9 * DAY)).toBe(false)
    expect(askDue(asked, 7, 1000 + 11 * DAY)).toBe(false)
    expect(askDue(asked, 8, 1000 + 11 * DAY)).toBe(true)
  })
  it('never asks again once told not to', () => {
    expect(askDue({ ...fresh, never: true }, 50)).toBe(false)
  })
})
