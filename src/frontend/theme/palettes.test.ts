import { describe, expect, it } from 'vitest'
import { PALETTES, contrast, deriveTheme } from './palettes'

describe('colour lab palettes', () => {
  it('has 18 palettes with unique ids', () => {
    expect(PALETTES).toHaveLength(18)
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(18)
  })
  it.each(PALETTES)('$name stays readable', (p) => {
    const t = deriveTheme(p)
    expect(contrast(t._text, t._bg)).toBeGreaterThanOrEqual(12)
    expect(contrast(t._accent, t._bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--dim'], t._bg)).toBeGreaterThanOrEqual(7)
    expect(contrast(t['--faint'], t._bg)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--accent-ink'], t._accent)).toBeGreaterThanOrEqual(4.5)
  })
})
