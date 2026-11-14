import { PLAYERS, type Player, type Pos } from '../data/players'
import { AFRICA, SOUTH_AMERICA } from '../data/honours'
import { AUTOPICK_MAX_OVR, CHAOS } from './config'
import { slotsOf, type Perk, type Team } from './draft'
import { penalty } from './position'
import { pick, weighted, type Rng } from './rng'

// Chaos Cards: a modifier layer usable by any draft mode. Adding a card = adding one entry to CARDS.
// Every player is dealt their own card each round; table cards (reverse, shield, pass it on) are an
// occasional extra event that changes the round for everyone.
export type Category = 'restriction' | 'modifier' | 'wild' | 'none'
export type Rarity = 'common' | 'rare' | 'legendary'
export type Ctx = { era?: string; nation?: string; league?: string; letter?: string }
export type Effect = keyof Perk | 'reverse' | 'luckyDip' | 'speed' | 'steal' | 'shield' | 'passItOn'
export type Card = {
  id: string
  name: string
  description: (ctx: Ctx) => string
  category: Category
  rarity: Rarity
  roll?: (rng: Rng) => Ctx // random parameter shown on the card
  filter?: (p: Player, team: Team, slot: Pos, ctx: Ctx) => boolean
  effect?: Effect
}
export type Active = { card: Card; ctx: Ctx }

const ERAS = ['30s', '50s', '60s', '70s', '80s', '90s', '00s', '10s', '20s']
const NATIONS = [...new Set(PLAYERS.map((p) => p.nation))]
const LEAGUES = [...new Set(PLAYERS.flatMap((p) => p.leagues))]

const initial = (p: Player) => p.name.normalize('NFD')[0].toUpperCase()
const r = (id: string, name: string, rarity: Rarity, description: Card['description'], filter: Card['filter'], roll?: Card['roll']): Card =>
  ({ id, name, category: 'restriction', rarity, description, filter, roll })
const fx = (id: string, name: string, category: Category, rarity: Rarity, effect: Effect | undefined, text: string): Card =>
  ({ id, name, category, rarity, effect, description: () => text })

export const CARDS: Card[] = [
  r('time-machine', 'Time Machine', 'common', () => 'Only players from the 1990s or earlier.', (p) => ERAS.indexOf(p.era) <= ERAS.indexOf('90s')),
  r('gen-z', 'Gen Z', 'common', () => 'Only players from the 2020s.', (p) => p.era === '20s'),
  r('golden-era', 'Golden Era', 'common', (c) => `Only players from the ${c.era}.`, (p, _t, _s, c) => p.era === c.era, (rng) => ({ era: pick(rng, ERAS.slice(1)) })),
  r('samba', 'Samba Time', 'common', () => 'Only Brazilian players.', (p) => p.nation === 'Brazil'),
  r('nation-lock', 'Nation Lock', 'common', (c) => `Only players from ${c.nation}.`, (p, _t, _s, c) => p.nation === c.nation, (rng) => ({ nation: pick(rng, NATIONS) })),
  r('league-lock', 'League Lock', 'common', (c) => `Only players who played in the ${c.league}.`, (p, _t, _s, c) => p.leagues.includes(c.league!), (rng) => ({ league: pick(rng, LEAGUES) })),
  r('underdog', 'Underdog', 'common', () => 'Maximum 82 OVR.', (p) => p.ovr <= 82),
  r('elite', 'Elite Only', 'rare', () => 'Minimum 88 OVR.', (p) => p.ovr >= 88),
  r('one-club', 'One-Club Hero', 'common', () => 'Only players who played for exactly one club.', (p) => p.clubs.length === 1),
  r('foreign-legion', 'Foreign Legion', 'common', () => 'Pick a nation nobody in your team is from yet.', (p, t) => !t.picks.some((q) => q?.nation === p.nation)),
  r('world-champs', 'World Champions', 'rare', () => 'Only players who won the World Cup.', (p) => p.wc),
  r('no-star', 'No Star on the Shirt', 'common', () => 'Only players who never won the World Cup.', (p) => !p.wc),
  r('copa', 'Copa América', 'common', () => 'Only South American players.', (p) => SOUTH_AMERICA.has(p.nation)),
  r('africa', 'Africa Cup', 'rare', () => 'Only African players.', (p) => AFRICA.has(p.nation)),
  r('no-prem', 'No Premier League', 'common', () => 'Only players who never played in the Premier League.', (p) => !p.leagues.includes('Premier League')),
  r('journeyman', 'Journeyman', 'common', () => 'Only players who played for 4 or more clubs.', (p) => p.clubs.length >= 4),
  r('mid-table', 'Mid-Table', 'common', () => 'Only players rated 76 to 84.', (p) => p.ovr >= 76 && p.ovr <= 84),
  r('bargain', 'Bargain Bin', 'rare', () => 'Maximum 74 OVR.', (p) => p.ovr <= 74),
  r('alphabet', 'Alphabet Soup', 'common', (c) => `Only players whose name starts with ${c.letter}.`, (p, _t, _s, c) => initial(p) === c.letter, (rng) => ({ letter: pick(rng, [...'ABCDFGJKLMPRST']) })),
  r('compatriot', 'Compatriot', 'common', () => 'Same nation as someone already in your team.', (p, t) => t.picks.some((q) => q?.nation === p.nation)),
  r('old-teammates', 'Old Teammates', 'rare', () => 'Pick someone who shared a club with one of your players.', (p, t) => t.picks.some((q) => q && q.id !== p.id && q.clubs.some((c) => p.clubs.includes(c)))),
  r('wrong-foot', 'Wrong Foot', 'rare', () => 'Pick a player who is NOT natural in this slot. Normal penalties apply.', (p, _t, slot) => p.positions[0] !== slot),
  fx('captain', "Captain's Armband", 'modifier', 'rare', 'captain', 'Your pick this round is your captain: +3 OVR in the match.'),
  fx('double-link', 'Double Link', 'modifier', 'rare', 'doubleLink', 'Chemistry links involving your pick this round count double.'),
  fx('hot-head', 'Hot Head', 'modifier', 'common', 'hotHead', 'Your pick this round is 3x as likely to see red.'),
  fx('big-game', 'Big Game Player', 'modifier', 'common', 'bigGame', 'Your pick this round gets +5 OVR in extra time and penalties.'),
  fx('reverse', 'Reverse', 'wild', 'rare', 'reverse', 'Table card: pick order is reversed this round.'),
  fx('lucky-dip', 'Lucky Dip', 'wild', 'rare', 'luckyDip', 'Your pick is chosen at random for you.'),
  fx('speed', 'Speed Round', 'wild', 'common', 'speed', `Only ${CHAOS.speedSeconds} seconds for your pick.`),
  fx('steal', 'Steal', 'wild', 'legendary', 'steal', 'Before you pick, you may steal one player from an opponent. They get a random sub-80 replacement.'),
  fx('shield', 'Shield', 'wild', 'rare', 'shield', 'Table card: everyone may protect one player from steals and swaps for the rest of the game.'),
  fx('pass-it-on', 'Pass It On', 'wild', 'legendary', 'passItOn', 'Table card: after this round, everyone hands their newest pick to the player on their left.'),
  fx('calm', 'Calm Before the Storm', 'none', 'common', undefined, 'No rule this round.'),
]
export const CALM = CARDS.find((c) => c.id === 'calm')!

export type ChaosSettings = { every: 1 | 2; restriction: boolean; modifier: boolean; wild: boolean }
export const DEFAULT_CHAOS_SETTINGS: ChaosSettings = { every: 1, restriction: true, modifier: true, wild: true }

export const isValid = (p: Player, team: Team, slot: Pos, a: Active | null) => !a?.card.filter || a.card.filter(p, team, slot, a.ctx)
const sensible = (p: Player, slot: Pos) => penalty(p, slot) < CHAOS.sensiblePenalty

export const TABLE_EFFECTS: Effect[] = ['reverse', 'shield', 'passItOn']
export const isTable = (c: Card) => !!c.effect && TABLE_EFFECTS.includes(c.effect)

// The drafter needs at least CHAOS.minValid sensible, valid, untaken players for their slot.
export function feasible(a: Active, team: Team, slotIdx: number, available: Player[]) {
  if (!a.card.filter) return true
  const slot = slotsOf(team)[slotIdx].pos
  return available.filter((p) => sensible(p, slot) && isValid(p, team, slot, a)).length >= CHAOS.minValid
}

/** One player's card for this round. `history` is that player's own earlier cards. */
export function drawCard(history: Card[], round: number, team: Team, available: Player[], settings: ChaosSettings, rng: Rng): Active {
  const wilds = history.filter((c) => c.category === 'wild').length
  const lastWild = history.at(-1)?.category === 'wild'
  const legendaries = history.filter((c) => c.rarity === 'legendary').length
  let eligible = CARDS.filter(
    (c) =>
      !isTable(c) &&
      (c.category === 'none' || settings[c.category]) &&
      (c === CALM || !history.includes(c)) &&
      !(c.category === 'wild' && (round === 0 || lastWild || wilds >= CHAOS.maxWild)) &&
      !(c.rarity === 'legendary' && legendaries >= CHAOS.maxLegendary),
  )
  for (let tries = 0; tries < CHAOS.redraws && eligible.length; tries++) {
    const rarities = (['common', 'rare', 'legendary'] as Rarity[]).filter((x) => eligible.some((c) => c.rarity === x))
    const rarity = weighted(rng, rarities, (x) => CHAOS.weights[x])
    const card = pick(rng, eligible.filter((c) => c.rarity === rarity))
    const a: Active = { card, ctx: card.roll?.(rng) ?? {} }
    if (feasible(a, team, round, available)) return a
    if (!card.roll) eligible = eligible.filter((c) => c !== card) // a rolled card might work with a different roll
  }
  return { card: CALM, ctx: {} }
}

/** Sometimes a table card lands on top of everyone's own cards. Never in round 1, never twice. */
export function drawEvent(events: Card[], round: number, settings: ChaosSettings, rng: Rng): Active | null {
  if (!settings.wild || round === 0 || events.length >= CHAOS.maxEvents || rng() > CHAOS.eventChance) return null
  const legendary = events.some((c) => c.rarity === 'legendary')
  const eligible = CARDS.filter((c) => isTable(c) && !events.includes(c) && !(legendary && c.rarity === 'legendary'))
  return eligible.length ? { card: pick(rng, eligible), ctx: {} } : null
}

// Timeout / Lucky Dip pick: fits the slot + card + under 80, then drop "under 80", then just valid.
export function chaosPick(available: Player[], team: Team, slot: Pos, a: Active | null, rng: Rng, capOvr = true): Player {
  const valid = available.filter((p) => isValid(p, team, slot, a))
  const tiers = [
    valid.filter((p) => p.positions.includes(slot) && (!capOvr || p.ovr <= AUTOPICK_MAX_OVR)),
    valid.filter((p) => p.positions.includes(slot)),
    valid.filter((p) => sensible(p, slot)),
    valid,
    available,
  ]
  return pick(rng, tiers.find((t) => t.length)!)
}

const withPerk = (team: Team, id: number, perk: Perk | undefined): Team =>
  perk ? { ...team, perks: { ...team.perks, [id]: perk } } : team

// Steal: the stolen player takes the stealer's same slot; the displaced player returns to the pool;
// the victim gets a random untaken sub-80 player for that slot.
export function steal(teams: Team[], stealer: number, victim: number, slotIdx: number, available: Player[], rng: Rng): Team[] {
  const p = teams[victim].picks[slotIdx]!
  const vSlot = slotsOf(teams[victim])[slotIdx].pos
  const fits = available.filter((x) => x.positions.includes(vSlot))
  const cheap = fits.filter((x) => x.ovr <= AUTOPICK_MAX_OVR)
  const sub = cheap.length ? pick(rng, cheap) : [...(fits.length ? fits : available)].sort((a, b) => a.ovr - b.ovr)[0]
  return teams.map((t, i) => {
    if (i === stealer) return withPerk({ ...t, picks: t.picks.map((x, j) => (j === slotIdx ? p : x)) }, p.id, teams[victim].perks?.[p.id])
    if (i === victim) return { ...t, picks: t.picks.map((x, j) => (j === slotIdx ? sub : x)) }
    return t
  })
}

// Pass It On: each team's pick in `slotIdx` moves to the next player in seating order.
// Teams whose pick is shielded sit out, and the rotation skips them so no player is lost.
export function passItOn(teams: Team[], slotIdx: number): Team[] {
  const ring = teams.map((_, i) => i).filter((i) => {
    const p = teams[i].picks[slotIdx]
    return p && !teams[i].shielded?.includes(p.id)
  })
  if (ring.length < 2) return teams
  const next = [...teams]
  ring.forEach((to, k) => {
    const from = ring[(k - 1 + ring.length) % ring.length]
    const incoming = teams[from].picks[slotIdx]!
    next[to] = withPerk({ ...teams[to], picks: teams[to].picks.map((x, j) => (j === slotIdx ? incoming : x)) }, incoming.id, teams[from].perks?.[incoming.id])
  })
  return next
}
