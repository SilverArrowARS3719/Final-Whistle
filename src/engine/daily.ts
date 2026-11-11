// The Daily Draft: one puzzle a day, identical for everyone. Eleven rounds, three players to choose from in
// each (the options never depend on what you picked, so every result is comparable), then three matches
// against themed legends sides that get harder. Everything is derived from the date.
import { PLAYERS, type Player, type Pos } from '../data/players'
import { FORMATIONS, FORMATION_NAMES } from '../data/formations'
import { AFRICA, SOUTH_AMERICA } from '../data/honours'
import { strength } from './career'
import { fillBench, newTeam, slotsOf, type Team } from './draft'
import { effectiveOvr, penalty } from './position'
import { makeRng, pick, shuffle, type Rng } from './rng'
import { simulateMatch, type MatchResult } from './sim'

export const OPTIONS = 3
const LAUNCH = '2026-11-12' // Daily #1

/** Local calendar day, so the puzzle turns over at the player's midnight. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const toUtc = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) }
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
export const addDays = (key: string, n: number) => new Date(toUtc(key) + n * 86_400_000).toISOString().slice(0, 10)
export const dailyNumber = (key: string) => daysBetween(LAUNCH, key) + 1

export function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export type Rule = { id: string; name: string; desc: string; test: (p: Player) => boolean }
const has = (p: Player, league: string) => p.leagues.includes(league)
export const RULES: Rule[] = [
  { id: 'open', name: 'Open day', desc: 'Anyone can turn up. Pure taste.', test: () => true },
  { id: 'no-elite', name: 'No superstars', desc: 'Nobody rated 91 or above.', test: (p) => p.ovr <= 90 },
  { id: 'premier', name: 'Premier League only', desc: 'Every option played in the Premier League.', test: (p) => has(p, 'Premier League') },
  { id: 'world-champs', name: 'World champions', desc: 'Every option won the World Cup.', test: (p) => p.wc },
  { id: 'no-champs', name: 'Never won it', desc: 'Nobody who won the World Cup.', test: (p) => !p.wc },
  { id: 'abroad', name: 'Outside Europe', desc: 'South American and African players only.', test: (p) => SOUTH_AMERICA.has(p.nation) || AFRICA.has(p.nation) },
  { id: 'modern', name: 'Modern era', desc: 'Primes from 2010 onwards.', test: (p) => p.era === '10s' || p.era === '20s' },
  { id: 'vintage', name: 'Vintage', desc: 'Primes before 2000.', test: (p) => ['50s', '60s', '70s', '80s', '90s'].includes(p.era) },
  { id: 'serie-a', name: 'Calcio', desc: 'Every option played in Serie A.', test: (p) => has(p, 'Serie A') },
  { id: 'la-liga', name: 'La Liga', desc: 'Every option played in La Liga.', test: (p) => has(p, 'La Liga') },
]

type Theme = { name: string; test: (p: Player) => boolean }
const THEMES: Theme[] = [
  ...['Brazil', 'Argentina', 'Italy', 'Germany', 'France', 'Spain', 'England', 'Netherlands', 'Portugal'].map((n) => ({ name: `${n} Legends`, test: (p: Player) => p.nation === n })),
  ...['Real Madrid', 'Barcelona', 'AC Milan', 'Manchester United', 'Bayern Munich', 'Juventus', 'Liverpool', 'Inter Milan', 'Ajax', 'Chelsea', 'Arsenal'].map((c) => ({ name: `${c} Legends`, test: (p: Player) => p.clubs.includes(c) })),
]
export const OPP_RATINGS = [81, 85, 89] as const
export const OPP_LABELS = ['Warm-up', 'Contender', 'Boss'] as const

export type Daily = { key: string; number: number; formation: string; rule: Rule; rounds: Player[][]; opponents: Team[] }

// Three options for a slot, shuffled: a star, a squad player, and a wildcard who shares a club or country
// with someone offered earlier (lower rated, but the chemistry can make up for it).
function optionsFor(pos: Pos, pool: Player[], used: Set<number>, earlier: Player[], rng: Rng): Player[] {
  const fits = (max: number) => pool.filter((p) => !used.has(p.id) && penalty(p, pos) <= max)
  let cands = fits(0)
  if (cands.length < OPTIONS + 6) cands = fits(3)
  if (cands.length < OPTIONS + 6) cands = PLAYERS.filter((p) => !used.has(p.id) && penalty(p, pos) <= 3)
  const byRating = [...cands].sort((a, b) => effectiveOvr(b, pos) - effectiveOvr(a, pos))
  const star = pick(rng, byRating.slice(0, Math.min(5, Math.ceil(byRating.length / 4))))
  const rest = byRating.filter((p) => p !== star)
  const q = Math.max(1, Math.floor(rest.length / 4))
  const solid = pick(rng, rest.slice(q, Math.max(q + 1, q * 3)))
  const links = rest.filter((p) => p !== solid && earlier.some((e) => e.nation === p.nation || e.clubs.some((c) => p.clubs.includes(c))))
  const wild = links.length ? pick(rng, links.slice(0, Math.max(1, Math.ceil(links.length * 0.6)))) : pick(rng, rest.filter((p) => p !== solid))
  return shuffle(rng, [star, solid, wild])
}

function legendsSide(theme: Theme, target: number, exclude: Set<number>): Team {
  const t = newTeam(theme.name, '4-3-3')
  const pool = PLAYERS.filter((p) => theme.test(p) && !exclude.has(p.id))
  t.picks = slotsOf(t).map((s) => {
    const best = [...pool].sort((a, b) => effectiveOvr(b, s.pos) - effectiveOvr(a, s.pos))[0]
    pool.splice(pool.indexOf(best), 1)
    return best
  })
  t.bench = pool.sort((a, b) => b.ovr - a.ovr).slice(0, 3)
  t.boost = Math.round(target - strength(t)) // the side plays at the day's rating, with real names
  return t
}

const cache = new Map<string, Daily>()
export function dailyFor(key: string): Daily {
  const hit = cache.get(key)
  if (hit) return hit
  const rng = makeRng(hashString(`daily:${key}`))
  const formation = pick(rng, FORMATION_NAMES)
  const rule = dailyNumber(key) === 1 ? RULES[0] : pick(rng, RULES)
  const pool = PLAYERS.filter(rule.test)
  const used = new Set<number>()
  const rounds = FORMATIONS[formation].map((s) => {
    const opts = optionsFor(s.pos, pool, used, [...used].map((id) => PLAYERS[id]), rng)
    opts.forEach((p) => used.add(p.id))
    return opts
  })
  const themes = shuffle(rng, THEMES.filter((t) => PLAYERS.filter(t.test).length >= 18)).slice(0, 3)
  const opponents = themes.map((th, i) => legendsSide(th, OPP_RATINGS[i], used))
  const d = { key, number: dailyNumber(key), formation, rule, rounds, opponents }
  cache.set(key, d)
  return d
}

/** Your XI for the day. The bench is the same for everyone so only the picks decide the result. */
export function dailyTeam(d: Daily, picks: Player[], name = 'Your XI'): Team {
  const t = newTeam(name, d.formation)
  t.picks = picks
  const taken = new Set([...d.rounds.flat(), ...d.opponents.flatMap((o) => [...o.picks, ...o.bench])].map((p) => p!.id))
  return fillBench([t], PLAYERS.filter((p) => !taken.has(p.id)), makeRng(hashString(`bench:${d.key}`)))[0]
}

export type Outcome = 'W' | 'WP' | 'LP' | 'L' // win, win on pens, lose on pens, lose
export const POINTS: Record<Outcome, number> = { W: 3, WP: 2, LP: 1, L: 0 }
export type DailyResult = { points: number; gf: number; ga: number; rating: number; outcomes: Outcome[]; scores: [number, number][]; pens: ([number, number] | null)[] }

export const matchSeed = (d: Daily, i: number) => hashString(`match:${d.key}:${i}`)
export const playDailyMatch = (d: Daily, team: Team, i: number): MatchResult => simulateMatch(team, d.opponents[i], matchSeed(d, i))

export function playDaily(d: Daily, picks: Player[]): DailyResult {
  const team = dailyTeam(d, picks)
  const res = d.opponents.map((_, i) => playDailyMatch(d, team, i))
  const outcomes = res.map((m): Outcome => (m.winner === 0 ? (m.pens ? 'WP' : 'W') : m.pens ? 'LP' : 'L'))
  return {
    points: outcomes.reduce((s, o) => s + POINTS[o], 0),
    gf: res.reduce((s, m) => s + m.score[0], 0),
    ga: res.reduce((s, m) => s + m.score[1], 0),
    rating: Math.round(strength(team) * 10) / 10,
    outcomes,
    scores: res.map((m) => m.score),
    pens: res.map((m) => m.pens),
  }
}

/** Best possible rating on the day: how close did you get? */
export function bestRating(d: Daily) {
  const picks = d.rounds.map((opts, i) => {
    const pos = FORMATIONS[d.formation][i].pos
    return [...opts].sort((a, b) => effectiveOvr(b, pos) - effectiveOvr(a, pos))[0]
  })
  return Math.round(strength(dailyTeam(d, picks)) * 10) / 10
}

const EMOJI: Record<Outcome, string> = { W: '🟩', WP: '🟨', LP: '🟧', L: '🟥' }
export function shareText(d: Daily, r: DailyResult, streak: number) {
  const lines = [
    `The Draft Room · Daily #${d.number}`,
    `${r.outcomes.map((o) => EMOJI[o]).join('')} ${r.points}/9`,
    r.scores.map((s, i) => `${s[0]}-${s[1]}${r.pens[i] ? 'p' : ''}`).join(' · '),
  ]
  if (streak > 1) lines.push(`🔥 ${streak}-day streak`)
  return lines.join('\n')
}

// ---------- this device's daily history ----------
export type DayRecord = { picks: number[]; result?: DailyResult }
const HKEY = 'fw-daily'
export function loadDaily(): Record<string, DayRecord> {
  try { return JSON.parse(localStorage.getItem(HKEY) ?? '{}') } catch { return {} }
}
export function saveDay(key: string, rec: DayRecord) {
  const all = { ...loadDaily(), [key]: rec }
  try { localStorage.setItem(HKEY, JSON.stringify(all)) } catch { /* not remembered */ }
  return all
}

/** Consecutive finished days ending today (or yesterday, if today isn't played yet). */
export function streakOf(history: Record<string, DayRecord>, today = dayKey()) {
  let day = history[today]?.result ? today : addDays(today, -1)
  let n = 0
  while (history[day]?.result) { n++; day = addDays(day, -1) }
  return n
}
export function bestStreakOf(history: Record<string, DayRecord>) {
  const days = Object.keys(history).filter((k) => history[k].result).sort()
  let best = 0, run = 0
  days.forEach((k, i) => { run = i > 0 && daysBetween(days[i - 1], k) === 1 ? run + 1 : 1; best = Math.max(best, run) })
  return best
}
