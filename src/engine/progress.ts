// Player progression on this device: XP and levels, lifetime stats, achievements. Every finished game,
// daily and share feeds record(); listeners (the toast stack, the tracker) hear what was earned.
import type { Mode } from '../screens/Landing'

export type ModeStats = { played: number; won: number }
export type Stats = {
  played: number
  won: number
  byMode: Partial<Record<Mode, ModeStats>>
  online: number
  onlineWon: number
  cpuWon: number
  fourPlayer: number
  dailies: number
  dailyBest: number
  bestStreak: number
  perfectDailies: number
  shares: number
  rematches: number
  fullSets: number
}
export type Progress = { xp: number; stats: Stats; achievements: Record<string, number> }

export type GameEvent =
  | { kind: 'game'; mode: Mode; players: number; won: boolean | null; online: boolean; cpu: boolean; fullSet?: boolean }
  | { kind: 'daily'; points: number; streak: number }
  | { kind: 'share' }
  | { kind: 'rematch' }

export type Achievement = { id: string; name: string; desc: string; xp: number; done: (s: Stats) => boolean }
const won = (s: Stats, m: Mode) => (s.byMode[m]?.won ?? 0) > 0
const MODES: Mode[] = ['xi', 'sot', 'chaos', 'auction', 'winners']
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'kickoff', name: 'Kick-off', desc: 'Finish your first game.', xp: 50, done: (s) => s.played >= 1 },
  { id: 'silverware', name: 'Silverware', desc: 'Win a game.', xp: 75, done: (s) => s.won >= 1 },
  { id: 'daily-habit', name: 'Daily habit', desc: 'Finish a Daily Draft.', xp: 50, done: (s) => s.dailies >= 1 },
  { id: 'beat-machine', name: 'Beat the machine', desc: 'Beat a CPU opponent.', xp: 75, done: (s) => s.cpuWon >= 1 },
  { id: 'goat', name: 'Greatest of all time', desc: 'Win All-Time XI.', xp: 100, done: (s) => won(s, 'xi') },
  { id: 'twisted', name: 'Twisted', desc: 'Win Stick or Twist.', xp: 100, done: (s) => won(s, 'sot') },
  { id: 'chaos', name: 'Agent of chaos', desc: 'Win Chaos Draft.', xp: 100, done: (s) => won(s, 'chaos') },
  { id: 'shrewd', name: 'Shrewd', desc: 'Win an Auction.', xp: 100, done: (s) => won(s, 'auction') },
  { id: 'winners', name: 'Born winners', desc: 'Win Team of Winners.', xp: 100, done: (s) => won(s, 'winners') },
  { id: 'hat-trick', name: 'Hat-trick', desc: 'Play the Daily three days running.', xp: 100, done: (s) => s.bestStreak >= 3 },
  { id: 'show-off', name: 'Show-off', desc: 'Share a result.', xp: 40, done: (s) => s.shares >= 1 },
  { id: 'run-it-back', name: 'Run it back', desc: 'Play a rematch.', xp: 40, done: (s) => s.rematches >= 1 },
  { id: 'full-house', name: 'Full house', desc: 'Finish a four-player game.', xp: 75, done: (s) => s.fourPlayer >= 1 },
  { id: 'bragging', name: 'Bragging rights', desc: 'Win an online game.', xp: 100, done: (s) => s.onlineWon >= 1 },
  { id: 'full-kit', name: 'Full kit', desc: 'Finish a game in all five modes.', xp: 150, done: (s) => MODES.every((m) => (s.byMode[m]?.played ?? 0) > 0) },
  { id: 'flawless', name: 'Flawless', desc: 'Score 9/9 in a Daily Draft.', xp: 200, done: (s) => s.perfectDailies >= 1 },
  { id: 'week', name: 'Week in, week out', desc: 'A seven-day Daily streak.', xp: 250, done: (s) => s.bestStreak >= 7 },
  { id: 'serial', name: 'Serial winner', desc: 'Win 10 games.', xp: 250, done: (s) => s.won >= 10 },
  { id: 'full-set', name: 'The full set', desc: 'Win all six trophies in Team of Winners.', xp: 300, done: (s) => s.fullSets >= 1 },
  { id: 'centurion', name: 'Centurion', desc: 'Finish 100 games.', xp: 500, done: (s) => s.played >= 100 },
  { id: 'ever-present', name: 'Ever-present', desc: 'A 30-day Daily streak.', xp: 750, done: (s) => s.bestStreak >= 30 },
]

// Level L starts at 75·L·(L−1) XP: 150 to reach level 2, then 300 more, 450 more…
export const xpForLevel = (level: number) => 75 * level * (level - 1)
export const TITLES = ['Sunday League', 'Academy', 'Reserves', 'First Team', 'Captain', 'International', 'Ballon d\'Or Shortlist', 'Club Legend', 'Hall of Fame', 'GOAT']
export function levelOf(xp: number) {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const from = xpForLevel(level), to = xpForLevel(level + 1)
  return { level, title: TITLES[Math.min(level, TITLES.length) - 1], into: xp - from, need: to - from }
}

/** Palettes unlock with levels: the first four are free, then two more each level. */
export const paletteLevel = (index: number) => (index < 4 ? 1 : 2 + Math.floor((index - 4) / 2))

export const XP = { game: 60, win: 90, cpuWin: 40, daily: 40, dailyPoint: 10, share: 15, rematch: 10 }

const emptyStats = (): Stats => ({ played: 0, won: 0, byMode: {}, online: 0, onlineWon: 0, cpuWon: 0, fourPlayer: 0, dailies: 0, dailyBest: 0, bestStreak: 0, perfectDailies: 0, shares: 0, rematches: 0, fullSets: 0 })
export const emptyProgress = (): Progress => ({ xp: 0, stats: emptyStats(), achievements: {} })

export type Earned = { xp: number; achievements: Achievement[]; levelUp: number | null; reason: string }

/** Pure: fold one event into progress. */
export function apply(p: Progress, e: GameEvent, now = Date.now()): { next: Progress; earned: Earned } {
  const s: Stats = { ...p.stats, byMode: { ...p.stats.byMode } }
  let xp = 0, reason = ''
  if (e.kind === 'game') {
    const m = { played: 0, won: 0, ...s.byMode[e.mode] }
    s.played++; m.played++
    if (e.online) s.online++
    if (e.players >= 4) s.fourPlayer++
    xp += XP.game; reason = 'Game finished'
    if (e.won) {
      s.won++; m.won++; xp += XP.win; reason = 'Win'
      if (e.online) s.onlineWon++
      if (e.cpu) { s.cpuWon++; xp += XP.cpuWin }
      if (e.fullSet) s.fullSets++
    }
    s.byMode[e.mode] = m
  } else if (e.kind === 'daily') {
    s.dailies++
    s.dailyBest = Math.max(s.dailyBest, e.points)
    s.bestStreak = Math.max(s.bestStreak, e.streak)
    if (e.points === 9) s.perfectDailies++
    xp += XP.daily + XP.dailyPoint * e.points + Math.min(e.streak, 10) * 5
    reason = `Daily Draft ${e.points}/9`
  } else if (e.kind === 'share') { s.shares++; xp += XP.share; reason = 'Shared' }
  else { s.rematches++; xp += XP.rematch; reason = 'Rematch' }

  const fresh = ACHIEVEMENTS.filter((a) => !p.achievements[a.id] && a.done(s))
  const achievements = { ...p.achievements }
  fresh.forEach((a) => { achievements[a.id] = now; xp += a.xp })
  const before = levelOf(p.xp).level, after = levelOf(p.xp + xp).level
  return { next: { xp: p.xp + xp, stats: s, achievements }, earned: { xp, achievements: fresh, levelUp: after > before ? after : null, reason } }
}

/** Two devices' progress for one account: keep the further-along copy. */
export const merge = (a: Progress, b: Progress) => (b.xp > a.xp ? b : a)

// ---------- this device ----------
const KEY = 'fw-progress'
export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Progress | null
    return raw ? { ...emptyProgress(), ...raw, stats: { ...emptyStats(), ...raw.stats } } : emptyProgress()
  } catch { return emptyProgress() }
}
const subs = new Set<(p: Progress, e: Earned | null, ev: GameEvent | null) => void>()
export function onProgress(fn: (p: Progress, e: Earned | null, ev: GameEvent | null) => void) { subs.add(fn); return () => { subs.delete(fn) } }
export function saveProgress(p: Progress, earned: Earned | null = null, ev: GameEvent | null = null) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* not remembered */ }
  subs.forEach((f) => f(p, earned, ev))
}
export function record(e: GameEvent) {
  const { next, earned } = apply(loadProgress(), e)
  saveProgress(next, earned, e)
  return earned
}
