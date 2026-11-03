export type Rng = () => number

// mulberry32: small seeded RNG so sims are reproducible in tests
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)]

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function weighted<T>(rng: Rng, items: T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0)
  let r = rng() * total
  for (const t of items) if ((r -= weight(t)) <= 0) return t
  return items[items.length - 1]
}
