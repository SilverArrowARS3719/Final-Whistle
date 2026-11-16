import { describe, expect, it } from 'vitest'
import { isCommon, passes, rules, strength, suggest } from './password'

describe('password rules', () => {
  it('rejects common passwords, even dressed up', () => {
    for (const pw of ['password', 'Password123!', 'P@ssw0rd2026!', 'Football2026#', 'Liverpool!!99', '12345678', 'qwerty123', 'Messi10Goat!'])
      expect(isCommon(pw), pw).toBe(true)
    expect(isCommon('Rabona-Libero-Nutmeg-47!')).toBe(false)
  })

  it('enforces every rule', () => {
    expect(passes('Short1!')).toBe(false)
    expect(passes('alllowercase1!x')).toBe(false)
    expect(passes('NoNumbersHere!x')).toBe(false)
    expect(passes('NoSymbolsHere12')).toBe(false)
    expect(passes('Goodpass1234!x')).toBe(false) // 1234 is a run
    expect(passes('Zq7!mRt2#kWp9')).toBe(true)
    expect(passes('ravi_kumar-Zq7!mRt2#', 'ravi_kumar@mail.com')).toBe(false)
    expect(rules('').every((r) => !r.ok)).toBe(true)
  })

  it('the meter only goes high when every rule passes', () => {
    expect(strength('')).toBe(0)
    expect(strength('password')).toBeLessThan(0.5)
    expect(strength('Zq7!mRt2#kWp')).toBeGreaterThanOrEqual(0.85)
    expect(strength('Zq7!mRt2#kWp9vX4&nB')).toBeGreaterThan(strength('Zq7!mRt2#kWp'))
  })

  it('suggestions always pass and are not repeated', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const pw = suggest('someone@mail.com')
      expect(passes(pw, 'someone@mail.com'), pw).toBe(true)
      seen.add(pw)
    }
    expect(seen.size).toBeGreaterThan(190)
  })
})
