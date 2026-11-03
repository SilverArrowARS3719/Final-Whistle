import type { Player, Pos } from '../data/players'
import { SIM } from './config'
import { chemBoosts } from './chemistry'
import { doubledIds, slotsOf, type Team } from './draft'
import type { Slot } from '../data/formations'
import { effectiveOvr, lineOf, penalty, type Line } from './position'
import { makeRng, weighted, pick, type Rng } from './rng'
import { BUILD_UP_MODS, BUILD_VS_DEF, DEF_MODS, FOCUS_SCALE, findRole, type Mods, type Tactics } from './tactics'

export type EventType = 'goal' | 'shot' | 'yellow' | 'red' | 'sub' | 'info' | 'pen'
export type MatchEvent = {
  step: number
  clock: string
  side: 0 | 1 | -1
  type: EventType
  text: string
  big?: boolean // shot was a big chance
  onTarget?: boolean
  scored?: boolean // penalty kick result
  player?: string // shooter on goal/shot events
}
export type PlayerLine = { name: string; pos: Pos; fit: number; rating: number; off?: boolean }
export type MatchResult = {
  names: [string, string]
  shapes: [Slot[], Slot[]] // formation slots, same order as the first 11 snapshot lines
  tactics: [Tactics, Tactics]
  labels: string[] // clock per step
  events: MatchEvent[]
  possA: number[] // cumulative minutes of possession for side 0, per step
  snapshots: [PlayerLine[], PlayerLine[]][] // per step
  score: [number, number]
  pens: [number, number] | null
  wentToET: boolean
  winner: 0 | 1
}

type OnPitch = {
  p: Player
  pos: Pos
  base: number // effective OVR incl. chemistry
  scorer: number
  fit: number
  rating: number
  yellow: boolean
  off: boolean // sent off
  hotHead?: boolean
  bigGame?: boolean
}
type Side = {
  name: string
  t: Tactics
  mods: Required<Mods>
  xi: OnPitch[]
  bench: Player[]
  subs: number
  reds: number
  out: PlayerLine[] // subbed-off players, kept for the ratings tab
}

const ZERO: Required<Mods> = { poss: 0, chance: 0, quality: 0, oppChance: 0, oppQuality: 0, cards: 0, fatigue: 0, lineCover: 0, longBall: 0 }

function sumMods(t: Tactics, slots: Pos[]): Required<Mods> {
  const m = { ...ZERO }
  const add = (x: Mods, k = 1) => {
    for (const key of Object.keys(x) as (keyof Mods)[]) m[key] += (x[key] ?? 0) * k
  }
  add(BUILD_UP_MODS[t.buildUp])
  add(DEF_MODS[t.defence])
  t.roles.forEach((r, i) => add(findRole(slots[i], r.role).mods, FOCUS_SCALE[r.focus]))
  return m
}

function makeSide(team: Team): Side {
  const slots = slotsOf(team).map((s) => s.pos)
  const chem = chemBoosts(team.picks, doubledIds(team))
  const xi = team.picks.map((p, i) => {
    if (!p) throw new Error(`${team.name} has an empty slot`)
    const role = findRole(slots[i], team.tactics.roles[i]?.role ?? '')
    const perk = team.perks?.[p.id] ?? {}
    return {
      p, pos: slots[i], base: effectiveOvr(p, slots[i]) + chem[i] + (team.boost ?? 0) + (perk.captain ? 3 : 0),
      hotHead: !!perk.hotHead, bigGame: !!perk.bigGame,
      scorer: role.scorer * (FOCUS_SCALE[team.tactics.roles[i]?.focus ?? 0] * 0.5 + 0.5),
      fit: 100, rating: 6.3, yellow: false, off: false,
    }
  })
  return { name: team.name, t: team.tactics, mods: sumMods(team.tactics, slots), xi, bench: [...team.bench], subs: 0, reds: 0, out: [] }
}

const now = (o: OnPitch) => o.base - Math.max(0, SIM.fatigueOvrStart - o.fit) * SIM.fatigueOvrK

function lineAvg(s: Side, line: Line): number {
  const ps = s.xi.filter((o) => !o.off && lineOf(o.pos) === line)
  if (!ps.length) return line === 'GK' ? 30 : 60
  return ps.reduce((a, o) => a + now(o), 0) / ps.length
}

function strength(s: Side) {
  const gk = lineAvg(s, 'GK'), def = lineAvg(s, 'DEF'), mid = lineAvg(s, 'MID'), att = lineAvg(s, 'ATT')
  return { gk, mid, att: 0.65 * att + 0.35 * mid, def: 0.65 * def + 0.35 * mid }
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const snap = (s: Side): PlayerLine[] => [
  ...s.xi.map((o) => ({ name: o.p.name, pos: o.pos, fit: Math.round(o.fit), rating: Math.round(o.rating * 10) / 10, off: o.off })),
  ...s.out,
]
const bump = (o: OnPitch, d: number) => (o.rating = clamp(o.rating + d, 3, 10))

const GOAL_LINES = [
  (n: string) => `GOAL! ${n} finishes it off.`,
  (n: string) => `GOAL! ${n} smashes it into the top corner.`,
  (n: string) => `GOAL! ${n} slots it past the keeper.`,
  (n: string) => `GOAL! ${n} heads it home.`,
  (n: string) => `GOAL! ${n} with a cool finish.`,
]

export function simulateMatch(teamA: Team, teamB: Team, seed = Date.now()): MatchResult {
  const rng = makeRng(seed)
  // how card-happy this match is: some games are calm, some are feisty
  const heat = 0.45 + rng() * 1.1
  const sides: [Side, Side] = [makeSide(teamA), makeSide(teamB)]
  const labels: string[] = []
  const events: MatchEvent[] = []
  const possA: number[] = []
  const snapshots: [PlayerLine[], PlayerLine[]][] = []
  const score: [number, number] = [0, 0]
  let possCount = 0

  const push = (side: 0 | 1 | -1, type: EventType, text: string, extra: Partial<MatchEvent> = {}) =>
    events.push({ step: labels.length - 1, clock: labels[labels.length - 1], side, type, text, ...extra })

  const minute = (label: string, minuteNo: number) => {
    labels.push(label)
    const st = [strength(sides[0]), strength(sides[1])]
    const pA = clamp(
      0.5 + (st[0].mid - st[1].mid) * SIM.midPossK + (sides[0].mods.poss - sides[1].mods.poss) / 2 +
        (sides[0].t.line - sides[1].t.line) * 0.005 + (sides[1].reds - sides[0].reds) * -SIM.redCardHit.poss,
      0.25, 0.75,
    )
    const a: 0 | 1 = rng() < pA ? 0 : 1
    if (a === 0) possCount++
    attack(a, st[a], st[1 - a])
    for (const i of [0, 1] as const) discipline(i)
    for (const i of [0, 1] as const) fatigue(i, minuteNo)
    possA.push(possCount)
    snapshots.push([snap(sides[0]), snap(sides[1])])
  }

  const attack = (ai: 0 | 1, sa: ReturnType<typeof strength>, sd: ReturnType<typeof strength>) => {
    const A = sides[ai], D = sides[1 - ai]
    const counterish = A.t.buildUp === 'Counter' || A.t.buildUp === 'Long Ball'
    let chance = SIM.chanceRate * Math.exp(SIM.attVsDefK * (sa.att - sd.def)) * (1 + A.mods.chance) * (1 + D.mods.oppChance)
    chance *= 1 + (A.t.width - 5) * 0.02 // wide = more chances…
    chance *= 1 - (D.t.width - 5) * 0.01
    if (A.t.line < 5) chance *= 1 - (5 - A.t.line) * 0.02 // deep own line = fewer bodies forward
    if (!counterish) chance *= 1 - (D.t.line - 5) * 0.025 // a high line squeezes slow build-up
    chance *= Math.pow(SIM.redCardHit.chance, A.reds) * Math.pow(SIM.redCardHit.oppChance, D.reds)
    if (rng() >= chance) return

    let q = SIM.goalQuality * (0.3 + rng() * 1.4) * (1 + A.mods.quality) * (1 + D.mods.oppQuality) // per-chance spread, mean 1
    q *= 1 + (BUILD_VS_DEF[A.t.buildUp][D.t.defence] ?? 0)
    if (A.t.buildUp === 'Long Ball') q *= 1 + A.mods.longBall
    q *= 1 - (A.t.width - 5) * 0.01 // …but crosses are lower quality
    q *= 1 + (D.t.width - 5) * 0.015 // wide defence leaves central gaps
    if (counterish && D.t.line > 5) q *= 1 + (D.t.line - 5) * 0.08 * (1 - D.mods.lineCover) * clamp(sa.att / 85, 0.8, 1.15)
    if (D.t.line < 5) q *= 1 - (5 - D.t.line) * 0.015

    const shooters = A.xi.filter((o) => !o.off && o.pos !== 'GK')
    const shooter = weighted(rng, shooters, (o) => {
      const lw = { ATT: 5, MID: o.pos === 'CAM' ? 3 : 1.6, DEF: 0.5, GK: 0 }[lineOf(o.pos)]
      return lw * o.scorer * Math.pow(Math.max(now(o), 30) / 80, 3)
    })
    q *= Math.exp(SIM.shotVsKeeperK * (now(shooter) - sd.gk))
    if (sd.gk < SIM.keeperHowlerBelow) q *= 1 + (SIM.keeperHowlerBelow - sd.gk) * SIM.keeperHowlerK // non-keepers in goal
    q = clamp(q, 0.01, 0.65)
    const big = q >= SIM.bigChance
    const gk = D.xi.find((o) => o.pos === 'GK' && !o.off)

    if (rng() < q) {
      score[ai]++
      bump(shooter, 1.1)
      A.xi.forEach((o) => o !== shooter && bump(o, 0.1))
      D.xi.forEach((o) => bump(o, o.pos === 'GK' ? -0.35 : lineOf(o.pos) === 'DEF' ? -0.25 : -0.1))
      push(ai, 'goal', `${pick(rng, GOAL_LINES)(shooter.p.name)} ${score[0]}-${score[1]}`, { big, onTarget: true, player: shooter.p.name })
    } else {
      const onTarget = rng() < 0.45
      if (onTarget && gk) bump(gk, 0.2)
      push(ai, 'shot', `${shooter.p.name} ${onTarget ? 'forces a save' : 'misses'}`, { big, onTarget, player: shooter.p.name })
    }
  }

  const discipline = (i: 0 | 1) => {
    const s = sides[i]
    const live = s.xi.filter((o) => !o.off && o.pos !== 'GK')
    if (!live.length) return
    const who = () => weighted(rng, live, (o) => (lineOf(o.pos) === 'ATT' ? 0.6 : 1) * (o.hotHead ? 3 : 1))
    if (rng() < SIM.straightRedRate * (1 + s.mods.cards)) return sendOff(i, who(), 'straight red card')
    // Chaos "Hot Head": extra red-card risk on top of the team roll (no extra rolls for normal teams)
    for (const o of live) if (o.hotHead && rng() < (SIM.straightRedRate / 5) * 2) return sendOff(i, o, 'lost his head')
    if (rng() < SIM.yellowRate * heat * (1 + s.mods.cards)) {
      const o = who()
      if (o.yellow) return sendOff(i, o, 'second yellow, he is off')
      o.yellow = true
      bump(o, -0.4)
      push(i, 'yellow', `Yellow card: ${o.p.name}`)
    }
  }
  const sendOff = (i: 0 | 1, o: OnPitch, why: string) => {
    o.off = true
    o.rating = clamp(o.rating - 2, 3, 10)
    sides[i].reds++
    push(i, 'red', `RED CARD: ${o.p.name} (${why})`)
  }

  const fatigue = (i: 0 | 1, minuteNo: number) => {
    const s = sides[i]
    for (const o of s.xi) {
      if (o.off) continue
      o.fit = Math.max(0, o.fit - SIM.fatiguePerMin * (1 + s.mods.fatigue) * (0.7 + rng() * 0.6) * (o.pos === 'GK' ? 0.3 : 1))
    }
    const [from, to] = SIM.subWindow
    const window = (minuteNo >= from && minuteNo <= to) || minuteNo > 95
    if (!window || !s.bench.length || s.subs >= 3 || rng() > 0.1) return
    const tired = s.xi.filter((o) => !o.off && o.pos !== 'GK' && o.fit < 78).sort((x, y) => x.fit - y.fit)[0]
    if (!tired) return
    const line = lineOf(tired.pos)
    const sub = s.bench.find((b) => lineOf(b.positions[0]) === line) ?? s.bench[0]
    if (sub.ovr - penalty(sub, tired.pos) < now(tired) - SIM.subMaxDrop) return // never swap a star for a much weaker sub
    s.bench = s.bench.filter((b) => b !== sub)
    s.subs++
    s.out.push({ name: tired.p.name, pos: tired.pos, fit: Math.round(tired.fit), rating: Math.round(tired.rating * 10) / 10, off: true })
    const idx = s.xi.indexOf(tired)
    s.xi[idx] = {
      p: sub, pos: tired.pos, base: sub.ovr - penalty(sub, tired.pos), scorer: tired.scorer,
      fit: 100, rating: 6.3, yellow: false, off: false,
    }
    push(i, 'sub', `Substitution: ${sub.name} on, ${tired.p.name} off`)
  }

  const half = (start: number, end: number, maxAdded: number, minAdded: number) => {
    for (let m = start; m <= end; m++) minute(`${m}'`, m)
    const added = minAdded + Math.floor(rng() * (maxAdded - minAdded + 1))
    if (added) events.push({ step: labels.length - 1, clock: labels[labels.length - 1], side: -1, type: 'info', text: `+${added} minutes added` })
    for (let k = 1; k <= added; k++) minute(`${end}+${k}'`, end)
  }

  labels.push("0'")
  possA.push(0)
  snapshots.push([snap(sides[0]), snap(sides[1])])
  push(-1, 'info', 'Kick-off!')
  half(1, 45, 4, 1)
  push(-1, 'info', `Half-time: ${score[0]}-${score[1]}`)
  half(46, 90, 7, 2)
  push(-1, 'info', `Full-time: ${score[0]}-${score[1]}`)

  let wentToET = false
  let pens: [number, number] | null = null
  if (score[0] === score[1]) {
    wentToET = true
    push(-1, 'info', 'Extra time!')
    for (const s of sides) for (const o of s.xi) if (o.bigGame) o.base += 5 // Chaos "Big Game Player"
    half(91, 105, 2, 0)
    half(106, 120, 3, 0)
    push(-1, 'info', `End of extra time: ${score[0]}-${score[1]}`)
  }
  if (score[0] === score[1]) pens = shootout(sides, rng, labels, events, possA, snapshots, possCount)

  const winner: 0 | 1 = pens ? (pens[0] > pens[1] ? 0 : 1) : score[0] > score[1] ? 0 : 1
  return {
    names: [teamA.name, teamB.name], shapes: [slotsOf(teamA), slotsOf(teamB)], tactics: [teamA.tactics, teamB.tactics],
    labels, events, possA, snapshots, score, pens, wentToET, winner,
  }
}

function shootout(
  sides: [Side, Side], rng: Rng, labels: string[], events: MatchEvent[],
  possA: number[], snapshots: [PlayerLine[], PlayerLine[]][], possCount: number,
): [number, number] {
  const takers = sides.map((s) => s.xi.filter((o) => !o.off && o.pos !== 'GK').sort((a, b) => now(b) - now(a)))
  const keepers = sides.map((s) => s.xi.find((o) => o.pos === 'GK' && !o.off))
  const pens: [number, number] = [0, 0]
  const taken: [number, number] = [0, 0]
  labels.push('PENS')
  possA.push(possCount)
  snapshots.push([snap(sides[0]), snap(sides[1])])
  events.push({ step: labels.length - 1, clock: 'PENS', side: -1, type: 'info', text: 'Penalty shootout!' })
  for (let k = 0; ; k++) {
    const i = (k % 2) as 0 | 1
    const t = takers[i][taken[i] % takers[i].length]
    const gk = keepers[1 - i]
    const p = clamp(SIM.penBase + SIM.penK * (now(t) - (gk ? now(gk) : 40)), 0.5, 0.95)
    const scored = rng() < p
    taken[i]++
    if (scored) pens[i]++
    labels.push('PENS')
    possA.push(possCount)
    snapshots.push([snap(sides[0]), snap(sides[1])])
    events.push({
      step: labels.length - 1, clock: 'PENS', side: i, type: 'pen', scored,
      text: `${t.p.name} ${scored ? 'scores' : 'misses'} (${pens[0]}-${pens[1]})`,
    })
    if (taken[0] <= 5) {
      // best of five: stop once one side can't catch up
      const leftA = 5 - taken[0], leftB = 5 - taken[1]
      if (pens[0] > pens[1] + leftB || pens[1] > pens[0] + leftA) break
    } else if (i === 1 && pens[0] !== pens[1]) break // sudden death
  }
  return pens
}

// Live stats up to a step, for the match screen.
export function statsAt(m: MatchResult, step: number) {
  const ev = m.events.filter((e) => e.step <= step)
  const count = (side: 0 | 1, f: (e: MatchEvent) => boolean) => ev.filter((e) => e.side === side && f(e)).length
  const playedSteps = Math.max(1, Math.min(step, m.possA.length - 1))
  const pa = Math.round((m.possA[playedSteps] / playedSteps) * 100) || 50
  const s = (side: 0 | 1) => ({
    goals: count(side, (e) => e.type === 'goal'),
    shots: count(side, (e) => e.type === 'goal' || e.type === 'shot'),
    onTarget: count(side, (e) => e.type === 'goal' || (e.type === 'shot' && !!e.onTarget)),
    chances: count(side, (e) => (e.type === 'goal' || e.type === 'shot') && !!e.big),
    yellows: count(side, (e) => e.type === 'yellow'),
    reds: count(side, (e) => e.type === 'red'),
    pens: count(side, (e) => e.type === 'pen' && !!e.scored),
  })
  return { poss: [pa, 100 - pa], a: s(0), b: s(1) }
}
