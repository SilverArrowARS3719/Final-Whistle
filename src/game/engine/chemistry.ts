import type { Player } from '../data/players'
import { CHEM } from './config'

const shares = (a: string[], b: string[]) => a.some((x) => b.includes(x))

export function linkPoints(a: Player, b: Player): number {
  return (
    (shares(a.clubs, b.clubs) ? CHEM.club : 0) +
    (a.nation === b.nation ? CHEM.nation : 0) +
    (shares(a.leagues, b.leagues) ? CHEM.league : 0) +
    (a.era === b.era ? CHEM.era : 0)
  )
}

// OVR boost per slot (null slots get 0). Links count across the whole XI, no matter when they played.
// `doubled`: player ids whose links count twice (Chaos "Double Link").
export function chemBoosts(xi: (Player | null)[], doubled?: Set<number>): number[] {
  return xi.map((p) => {
    if (!p) return 0
    const pts = xi.reduce((s, q) => s + (q && q !== p ? linkPoints(p, q) * (doubled?.has(p.id) || doubled?.has(q.id) ? 2 : 1) : 0), 0)
    return Math.min(CHEM.maxBoost, Math.floor(pts / CHEM.pointsPerBoost))
  })
}
