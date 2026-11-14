import { describe, expect, it } from 'vitest'
import { PLAYERS, type Player, type Pos } from '../data/players'
import { FORMATIONS, formationLabel, shapeFormation } from '../data/formations'
import { chemBoosts } from './chemistry'
import { autoPick, drafterAt, newTeam, slotsOf, type Team } from './draft'
import { penalty } from './position'
import { makeRng } from './rng'
import { simulateMatch, statsAt } from './sim'
import { standings, type Fixture } from './tournament'
import { deal, neededPerSlot, settle, teamCap, teamTotal } from './stickOrTwist'
import type { Tactics } from './tactics'

let uid = 10_000
// Synthetic player with zero chemistry links.
const fake = (ovr: number, pos: Pos): Player => ({
  id: uid++, name: `P${uid}`, ovr, positions: [pos], nation: `N${uid}`, clubs: [], leagues: [], era: `E${uid}`, wc: false,
})
function team(ovr: number, formation = '4-3-3', t: Partial<Tactics> = {}, override?: (pos: Pos, i: number) => Player): Team {
  const tm = newTeam(`T${ovr}`, formation)
  tm.picks = FORMATIONS[formation].map((s, i) => override?.(s.pos, i) ?? fake(ovr, s.pos))
  tm.bench = [fake(ovr - 6, 'CB'), fake(ovr - 6, 'CM'), fake(ovr - 6, 'ST')]
  tm.tactics = { ...tm.tactics, ...t }
  return tm
}
function winRate(a: Team, b: Team, n = 3000) {
  let w = 0, goals = 0
  for (let i = 0; i < n; i++) {
    // alternate sides so home/away order has no effect
    const flip = i % 2 === 1
    const m = flip ? simulateMatch(b, a, i + 1) : simulateMatch(a, b, i + 1)
    if (m.winner === (flip ? 1 : 0)) w++
    const et = m.events.findIndex((e) => e.text === 'Extra time!')
    goals += (et < 0 ? m.events : m.events.slice(0, et)).filter((e) => e.type === 'goal').length
  }
  return { win: w / n, goals: goals / n }
}

describe('position penalty', () => {
  const p = (pos: Pos) => fake(90, pos)
  it('matches the spec examples', () => {
    expect(penalty(p('LW'), 'RW')).toBeGreaterThanOrEqual(1)
    expect(penalty(p('LW'), 'RW')).toBeLessThanOrEqual(2)
    expect(penalty(p('CM'), 'CB')).toBe(8)
    expect(penalty(p('ST'), 'GK')).toBe(40)
    expect(penalty(p('CB'), 'CB')).toBe(0)
  })
  it('caps secondary positions', () => {
    expect(penalty({ ...p('CB'), positions: ['CB', 'CDM'] }, 'CDM')).toBe(1)
  })
})

describe('draft', () => {
  it('snakes', () => {
    const order = [2, 0, 1]
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => drafterAt(k, order))).toEqual([2, 0, 1, 1, 0, 2, 2])
  })
  it('auto-picks an untaken <80 player who plays the slot', () => {
    const rng = makeRng(1)
    for (let i = 0; i < 50; i++) {
      const pl = autoPick(PLAYERS, 'ST', rng)
      expect(pl.ovr).toBeLessThan(80)
      expect(pl.positions).toContain('ST')
    }
  })
})

describe('data', () => {
  it('has unique names and sane ratings', () => {
    expect(new Set(PLAYERS.map((p) => p.name)).size).toBe(PLAYERS.length)
    expect(PLAYERS.length).toBeGreaterThanOrEqual(100)
    for (const p of PLAYERS) expect(p.ovr).toBeGreaterThanOrEqual(65)
  })
  it('chemistry is small: max +3', () => {
    const xi = PLAYERS.filter((p) => p.nation === 'France').slice(0, 11)
    expect(Math.max(...chemBoosts(xi))).toBeLessThanOrEqual(3)
  })
})

describe('tournament', () => {
  it('sorts by points, then GD, then goals', () => {
    const f: Fixture[] = [
      { a: 0, b: 1, stage: '', score: [2, 0], winner: 0 },
      { a: 1, b: 2, stage: '', score: [3, 0], winner: 1 },
      { a: 0, b: 2, stage: '', score: [0, 1], winner: 2 },
    ]
    // all 3 pts; GD: 0:+1, 1:+1, 2:-2; GF: 0:2, 1:3
    expect(standings(3, f).map((r) => r.team)).toEqual([1, 0, 2])
  })
})

describe('match', () => {
  it('always has a winner and a sane event log', () => {
    for (let s = 1; s < 300; s++) {
      const m = simulateMatch(team(85), team(85), s)
      expect([0, 1]).toContain(m.winner)
      if (m.pens) expect(m.pens[0]).not.toBe(m.pens[1])
      else expect(m.score[0]).not.toBe(m.score[1])
      expect(m.labels.length).toBe(m.snapshots.length)
    }
  })
})

describe('match colour', () => {
  it('assists, corners, fouls and offsides stay in a realistic range', () => {
    const N = 200
    const tot = { fouls: 0, corners: 0, offsides: 0, goals: 0, assists: 0, xg: 0 }
    for (let i = 0; i < N; i++) {
      const m = simulateMatch(team(86), team(86), i + 1)
      const last = m.labels.length - 1
      const st = statsAt(m, last)
      tot.fouls += st.a.fouls + st.b.fouls
      tot.corners += st.a.corners + st.b.corners
      tot.offsides += st.a.offsides + st.b.offsides
      tot.xg += st.a.xg + st.b.xg
      const goals = m.events.filter((e) => e.type === 'goal')
      tot.goals += goals.length
      tot.assists += goals.filter((e) => e.assist).length
      for (const g of goals) expect(g.assist).not.toBe(g.player)
    }
    expect(tot.fouls / N).toBeGreaterThan(14)
    expect(tot.fouls / N).toBeLessThan(32)
    expect(tot.corners / N).toBeGreaterThan(3)
    expect(tot.corners / N).toBeLessThan(13)
    expect(tot.offsides / N).toBeGreaterThan(1.5)
    expect(tot.offsides / N).toBeLessThan(8)
    expect(tot.assists / tot.goals).toBeGreaterThan(0.5)
    expect(Math.abs(tot.xg - tot.goals) / tot.goals).toBeLessThan(0.2) // expected goals track real goals
  })
})

describe('balance', () => {
  it('88 beats 78 about 70-80% of the time', () => {
    const r = winRate(team(88), team(78))
    console.log('88 vs 78', r)
    expect(r.win).toBeGreaterThan(0.7)
    expect(r.win).toBeLessThan(0.8)
  })
  it('equal teams ~50/50 and 2.5-3 goals per 90', () => {
    const r = winRate(team(85), team(85))
    console.log('85 vs 85', r)
    expect(Math.abs(r.win - 0.5)).toBeLessThan(0.04)
    expect(r.goals).toBeGreaterThan(2.5)
    expect(r.goals).toBeLessThan(3)
  })
  it('a good tactical matchup shifts the win rate', () => {
    const counter = team(85, '4-3-3', { buildUp: 'Counter' })
    const highLine = team(85, '4-3-3', { defence: 'High', line: 9 })
    const r = winRate(counter, highLine)
    console.log('counter vs high line', r)
    expect(r.win).toBeGreaterThan(0.58)
  })
  it('striker in goal is heavily punished', () => {
    const silly = team(88, '4-3-3', {}, (pos) => (pos === 'GK' ? fake(88, 'ST') : null) ?? fake(88, pos))
    const r = winRate(silly, team(82))
    console.log('ST-in-goal 88 vs 82', r)
    expect(r.win).toBeLessThan(0.3)
  })
})

describe('chemistry balance', () => {
  it('a greedy all-star draft averages well under the +3 cap', () => {
    const slots = FORMATIONS['4-3-3'].map((s) => s.pos)
    const pool = [...PLAYERS]
    const xis: Player[][] = [[], [], [], []]
    for (let r = 0; r < 11; r++)
      for (const t of r % 2 ? [3, 2, 1, 0] : [0, 1, 2, 3]) {
        const best = pool.reduce((a, b) => (b.ovr - penalty(b, slots[r]) > a.ovr - penalty(a, slots[r]) ? b : a))
        xis[t].push(best)
        pool.splice(pool.indexOf(best), 1)
      }
    const avg = xis.flatMap((xi) => chemBoosts(xi)).reduce((a, b) => a + b, 0) / 44
    console.log('avg chem boost', avg)
    expect(avg).toBeGreaterThan(0.5)
    expect(avg).toBeLessThan(1.6)
  })
})

describe('appearance', () => {
  it('every player has a valid look', async () => {
    const { LOOKS } = await import('../data/appearance')
    const missing = PLAYERS.filter((p) => !LOOKS[p.name]).map((p) => p.name)
    expect(missing).toEqual([])
    for (const l of Object.values(LOOKS)) {
      expect(l.skin).toBeGreaterThanOrEqual(1)
      expect(l.skin).toBeLessThanOrEqual(6)
      expect('xzsfwlcadmpk').toContain(l.style)
      expect('bdnlrg').toContain(l.color)
      expect('nsbm').toContain(l.facial)
      expect('osnrv').toContain(l.face)
    }
  })
})

describe('custom formation', () => {
  it('parses a typed shape into slots in pick order and plays a match', () => {
    const r = shapeFormation('5-4-1')
    if ('error' in r) throw new Error(r.error)
    expect(r.slots.map((x) => x.pos)).toEqual(['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'LM', 'CM', 'CM', 'RM', 'ST'])
    expect(formationLabel(r.slots)).toBe('5-4-1')
    const t = newTeam('Custom', r.label, r.slots)
    t.picks = r.slots.map((x) => fake(85, x.pos))
    expect([0, 1]).toContain(simulateMatch(t, team(85), 7).winner)
    const four = shapeFormation('4-2-3-1')
    expect('slots' in four && four.slots.filter((x) => x.pos === 'CDM').length).toBe(2)
  })
  it('rejects shapes that are not exactly 10', () => {
    expect(shapeFormation('4-4-1')).toMatchObject({ error: expect.stringContaining('1 short') })
    expect(shapeFormation('4-4-3')).toMatchObject({ error: expect.stringContaining('1 too many') })
    expect(shapeFormation('4-x-2')).toHaveProperty('error')
  })
})

describe('analysis', () => {
  it('flags a high line against counters and a striker in goal', async () => {
    const { analyse } = await import('./analysis')
    const a = team(85, '4-3-3', { defence: 'High', line: 9 }, (pos) => (pos === 'GK' ? fake(88, 'ST') : null) ?? fake(85, pos))
    const b = team(85, '4-3-3', { buildUp: 'Counter' })
    const [ra] = analyse(simulateMatch(a, b, 3), [a, b])
    const text = ra.insights.map((i) => i.text).join(' ')
    expect(text).toMatch(/high line \(9\)/)
    expect(text).toMatch(/in goal was a disaster/)
  })
})

describe('stick or twist', () => {
  function botRates(margin: number, twists: number, n = 1000, players = 2) {
    let bust = 0, perfect = 0
    const cap = teamCap(11, margin)
    for (let d = 0; d < n; d++) {
      const rng = makeRng(d + 1)
      let pool = [...PLAYERS]
      const teams = Array.from({ length: players }, (_, i) => newTeam('T' + i, '4-3-3'))
      const left = teams.map(() => twists)
      for (let r = 0; r < 11; r++) for (let k = 0; k < players; k++) {
        const ti = r % 2 ? players - 1 - k : k
        const t = teams[ti], pos = slotsOf(t)[r].pos
        let p = deal(pool, pos, rng)
        while (left[ti] > 0 && p.ovr < neededPerSlot(teamTotal(t), cap, 11 - r)) {
          pool = pool.filter((x) => x !== p); left[ti]--; p = deal(pool, pos, rng)
        }
        pool = pool.filter((x) => x !== p)
        t.picks[r] = p
      }
      for (const t of teams) { const v = settle(t, pool, cap, rng).verdict.kind; if (v === 'bust') bust++; if (v === 'perfect') perfect++ }
    }
    return { bust: bust / (n * players), perfect: perfect / (n * players), cap }
  }
  it('cap comes from the data and the bot hits the bust / perfect targets', async () => {
    const { SOT } = await import('./config')
    const r = botRates(SOT.capMargin, SOT.twists)
    console.log('stick or twist', r)
    expect(r.bust).toBeGreaterThan(0.25)
    expect(r.bust).toBeLessThan(0.4)
    expect(r.perfect).toBeGreaterThan(0.05)
    expect(r.perfect).toBeLessThan(0.15)
  })
  it('a bust always ends at or under the cap', () => {
    const rng = makeRng(5)
    const t = newTeam('Greedy', '4-3-3')
    t.picks = [...PLAYERS].sort((a, b) => b.ovr - a.ovr).slice(0, 11)
    const cap = teamCap()
    const pool = PLAYERS.filter((p) => !t.picks.includes(p))
    const { team, verdict } = settle(t, pool, cap, rng)
    expect(verdict.kind).toBe('bust')
    expect(teamTotal(team)).toBeLessThanOrEqual(cap)
  })
})

describe('chaos cards', () => {
  it('deck rules hold per player over 1,000 random drafts', async () => {
    const { drawCard, drawEvent, isTable, DEFAULT_CHAOS_SETTINGS } = await import('./chaos')
    let differ = 0
    for (let d = 0; d < 1000; d++) {
      const rng = makeRng(d + 11)
      const teams = [newTeam('A', '4-3-3'), newTeam('B', '4-4-2')]
      let pool = [...PLAYERS]
      const hist: import('./chaos').Card[][] = [[], []]
      const events: import('./chaos').Card[] = []
      for (let r = 0; r < 11; r++) {
        const dealt = teams.map((t, i) => drawCard(hist[i], r, t, pool, DEFAULT_CHAOS_SETTINGS, rng).card)
        if (dealt[0] !== dealt[1]) differ++
        dealt.forEach((card, i) => {
          expect(isTable(card)).toBe(false)
          if (r === 0) expect(card.category).not.toBe('wild')
          if (hist[i].at(-1)?.category === 'wild') expect(card.category).not.toBe('wild')
          if (card.id !== 'calm') expect(hist[i]).not.toContain(card)
          hist[i].push(card)
        })
        const ev = drawEvent(events, r, DEFAULT_CHAOS_SETTINGS, rng)
        if (ev) { expect(r).toBeGreaterThan(0); expect(events).not.toContain(ev.card); events.push(ev.card) }
        for (const t of teams) { const p = pool[Math.floor(rng() * pool.length)]; t.picks[r] = p; pool = pool.filter((x) => x !== p) }
      }
      for (const h of hist) {
        expect(h.filter((c) => c.category === 'wild').length).toBeLessThanOrEqual(3)
        expect(h.filter((c) => c.rarity === 'legendary').length).toBeLessThanOrEqual(1)
      }
      expect(events.length).toBeLessThanOrEqual(2)
      expect(events.filter((c) => c.rarity === 'legendary').length).toBeLessThanOrEqual(1)
    }
    expect(differ / 11000).toBeGreaterThan(0.8) // players almost always get different cards
  })
  it('world cup and depth data are sound', async () => {
    const { WORLD_CUP_WINNERS } = await import('../data/honours')
    const names = new Set(PLAYERS.map((p) => p.name))
    expect(names.size).toBe(PLAYERS.length) // no duplicate players
    for (const n of WORLD_CUP_WINNERS) expect(names, n).toContain(n)
    for (const pos of ['GK', 'CB', 'ST'] as Pos[]) expect(PLAYERS.filter((p) => p.positions[0] === pos && p.ovr < 75).length).toBeGreaterThanOrEqual(15)
    expect(PLAYERS.find((p) => p.name === 'Lionel Messi')!.wc).toBe(true)
    expect(PLAYERS.find((p) => p.name === 'Johan Cruyff')!.wc).toBe(false)
  })
  it('an impossible restriction falls back to Calm', async () => {
    const { drawCard, CARDS } = await import('./chaos')
    const onlySamba = CARDS.filter((c) => c.id === 'samba')
    // no Brazilians left: the only eligible restriction is infeasible
    const pool = PLAYERS.filter((p) => p.nation !== 'Brazil')
    const settings = { every: 1 as const, restriction: true, modifier: false, wild: false }
    const hist = CARDS.filter((c) => c.category === 'restriction' && !onlySamba.includes(c))
    const a = drawCard(hist, 1, newTeam('A', '4-3-3'), pool, settings, makeRng(1))
    expect(a.card.id).toBe('calm')
  })
  it('steal and pass-it-on keep every player exactly once', async () => {
    const { steal, passItOn } = await import('./chaos')
    const teams = [newTeam('A', '4-3-3'), newTeam('B', '4-3-3'), newTeam('C', '4-3-3')]
    let pool = [...PLAYERS]
    for (let r = 0; r < 3; r++) for (const t of teams) { t.picks[r] = pool[0]; pool = pool.slice(1) }
    teams[2].shielded = [teams[2].picks[2]!.id]
    const passed = passItOn(teams, 2)
    const ids = passed.flatMap((t) => t.picks.slice(0, 3).map((p) => p!.id))
    expect(new Set(ids).size).toBe(9)
    expect(passed[2].picks[2]).toBe(teams[2].picks[2]) // shielded stays
    expect(passed[1].picks[2]).toBe(teams[0].picks[2])
    const stolen = steal(teams, 0, 1, 1, pool, makeRng(2))
    expect(stolen[0].picks[1]).toBe(teams[1].picks[1])
    expect(stolen[1].picks[1]!.ovr).toBeLessThan(80)
  })
  it('perks change the match: captain boosts, hot heads see red more', async () => {
    const base = team(85)
    const capt = team(85)
    capt.perks = Object.fromEntries(capt.picks.map((p) => [p!.id, { captain: true }]))
    expect(winRate(capt, base, 1500).win).toBeGreaterThan(0.55) // +3 on everyone ~ an 88 vs 85 side
    const hot = team(85)
    hot.perks = Object.fromEntries(hot.picks.map((p) => [p!.id, { hotHead: true }]))
    let reds = 0, normal = 0
    for (let s = 1; s < 500; s++) {
      reds += simulateMatch(hot, team(85), s).events.filter((e) => e.type === 'red' && e.side === 0).length
      normal += simulateMatch(team(85), team(85), s).events.filter((e) => e.type === 'red' && e.side === 0).length
    }
    expect(reds).toBeGreaterThan(normal * 1.8)
  })
})

describe('auction', () => {
  it('open bidding skips the leader and ends when only the leader is left', async () => {
    const { nextBidder } = await import('./auction')
    const order = [2, 0, 1]
    expect(nextBidder(order, [2, 0, 1], null, 2)).toBe(0)
    expect(nextBidder(order, [2, 0, 1], 0, 0)).toBe(1) // leader 0 is skipped
    expect(nextBidder(order, [2, 0, 1], 0, 1)).toBe(2)
    expect(nextBidder(order, [0], 0, 1)).toBeNull() // everyone else dropped: sold to 0
  })
  it('won players go to the best open slot; free fill only touches open slots', async () => {
    const { bestSlot, freeFill, openSlots } = await import('./auction')
    const { SMALL_SIDED } = await import('../data/formations')
    const t = newTeam('A', '5-a-side', SMALL_SIDED[5])
    expect(bestSlot(t, fake(88, 'ST'))).toBe(4)
    expect(bestSlot(t, fake(88, 'GK'))).toBe(0)
    t.picks[0] = fake(80, 'GK')
    const { teams, given } = freeFill([t], [0], PLAYERS, makeRng(3))
    expect(openSlots(teams[0])).toEqual([])
    expect(teams[0].picks[0]).toBe(t.picks[0])
    expect(given.length).toBe(4)
  })
  it('leftovers are cheap where cheap players exist', async () => {
    const { leftover } = await import('./auction')
    for (let s = 1; s < 50; s++) {
      for (const pos of ['RB', 'GK', 'CB', 'ST'] as Pos[]) expect(leftover(pos, PLAYERS, makeRng(s)).ovr).toBeLessThan(75)
      // with no cheap option left, the cheapest who can play there
      const noCheap = PLAYERS.filter((p) => p.ovr >= 75)
      const cheapestST = Math.min(...noCheap.filter((p) => p.positions.includes('ST')).map((p) => p.ovr))
      expect(leftover('ST', noCheap, makeRng(s)).ovr).toBe(cheapestST)
    }
  })
  it('5- and 7-a-side matches always produce a winner', async () => {
    const { SMALL_SIDED } = await import('../data/formations')
    for (const size of [5, 7] as const) {
      for (let s = 1; s < 60; s++) {
        const mk = (ovr: number) => {
          const t = newTeam('S', `${size}-a-side`, SMALL_SIDED[size])
          t.picks = SMALL_SIDED[size].map((x) => fake(ovr, x.pos))
          t.bench = [fake(75, 'CB'), fake(75, 'CM'), fake(75, 'ST')]
          return t
        }
        const m = simulateMatch(mk(86), mk(82), s)
        expect([0, 1]).toContain(m.winner)
        expect(m.snapshots[0][0].length).toBe(size)
      }
    }
  })
})

describe('online sync (diff + apply)', { timeout: 30_000 }, () => { // first import of persist pulls in all player data; slow while balance tests run in parallel
  it('a pick becomes one small edit and replaying edits rebuilds the same state', async () => {
    const { diff, setIn, reviveDeep } = await import('./persist')
    const a = { teams: [newTeam('A', '4-3-3'), newTeam('B', '4-4-2')], pickNo: 3 }
    const b = { ...a, teams: a.teams.map((t, i) => (i === 1 ? { ...t, picks: t.picks.map((p, j) => (j === 2 ? PLAYERS[10] : p)) } : t)), pickNo: 4 }
    const ops = diff(a, b)
    expect(ops.map((o) => o.path.join('.'))).toEqual(['teams.1.picks.2', 'pickNo'])
    // what another device does with the broadcast: JSON over the wire, revive, apply
    const wire = JSON.parse(JSON.stringify(ops)) as typeof ops
    let state: unknown = reviveDeep(a)
    for (const op of wire) state = setIn(state, op.path, reviveDeep(op.value))
    expect(state).toEqual(b)
    expect((state as typeof b).teams[1].picks[2]).toBe(PLAYERS[10]) // players are re-linked, not copies
  })
  it('length changes, removed keys and different players replace the whole value', async () => {
    const { diff } = await import('./persist')
    expect(diff({ x: [1, 2] }, { x: [1, 2, 3] })).toEqual([{ path: ['x'], value: [1, 2, 3] }])
    expect(diff({ x: { a: 1, b: 2 } }, { x: { a: 1 } })).toEqual([{ path: ['x'], value: { a: 1 } }])
    expect(diff({ p: PLAYERS[1] }, { p: PLAYERS[2] })).toEqual([{ path: ['p'], value: PLAYERS[2] }])
    expect(diff({ p: PLAYERS[1] }, { p: PLAYERS[1] })).toEqual([])
  })
})
