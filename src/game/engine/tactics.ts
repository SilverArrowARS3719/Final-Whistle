import type { Pos } from '../data/players'

export type BuildUp = 'Balanced' | 'Short Passing' | 'Counter' | 'Long Ball'
export type DefApproach = 'Deep' | 'Balanced' | 'High' | 'Aggressive'
export type Focus = 0 | 1 | 2 // none, +, ++

export const BUILD_UPS: BuildUp[] = ['Balanced', 'Short Passing', 'Counter', 'Long Ball']
export const DEF_APPROACHES: DefApproach[] = ['Deep', 'Balanced', 'High', 'Aggressive']
export const FOCUS_LABEL = ['', '+', '++']

export type Tactics = {
  buildUp: BuildUp
  defence: DefApproach
  width: number // 1-10
  line: number // 1-10
  roles: { role: string; focus: Focus }[] // one per slot
}

// Team-level modifiers, all additive fractions (0.02 = +2%).
export type Mods = {
  poss?: number // possession share
  chance?: number // own chance volume
  quality?: number // own chance quality
  oppChance?: number // opponent chance volume
  oppQuality?: number // opponent chance quality
  cards?: number
  fatigue?: number
  lineCover?: number // reduces the high-line penalty
  longBall?: number // extra quality when playing Long Ball
}

export type Role = { name: string; mods: Mods; scorer: number; desc: string }

const R = (name: string, mods: Mods, scorer: number, desc: string): Role => ({ name, mods, scorer, desc })

// Focus scales the whole role (bonus AND trade-off): none 1x, + 1.5x, ++ 2x.
export const FOCUS_SCALE = [1, 1.5, 2]

export const ROLES: Record<string, Role[]> = {
  GK: [
    R('Goalkeeper', { oppQuality: -0.01 }, 0, 'Stays home. Slightly better shot-stopping.'),
    R('Sweeper Keeper', { lineCover: 0.25, poss: 0.01, oppQuality: 0.01 }, 0, 'Covers behind a high line; can be caught out.'),
    R('Ball-Playing Keeper', { poss: 0.015, chance: 0.005, oppQuality: 0.012 }, 0, 'Starts attacks from the back; a misplaced pass can cost a goal.'),
  ],
  CB: [
    R('Defender', { oppQuality: -0.02, poss: -0.005 }, 0.5, 'Holds position, blocks shots.'),
    R('Stopper', { oppChance: -0.025, oppQuality: 0.01, cards: 0.15 }, 0.6, 'Steps out to win the ball. Picks up cards.'),
    R('Ball-Playing Defender', { poss: 0.015, chance: 0.01, oppQuality: 0.01 }, 0.4, 'Starts attacks; less solid.'),
  ],
  FB: [
    R('Fullback', { oppChance: -0.015 }, 0.4, 'Defends first.'),
    R('Wingback', { chance: 0.02, oppQuality: 0.015, fatigue: 0.1 }, 0.7, 'Bombs forward, leaves space behind.'),
    R('Inverted Fullback', { poss: 0.015, chance: -0.005 }, 0.4, 'Tucks in to help keep the ball.'),
  ],
  CM: [
    R('Holding', { oppChance: -0.02, chance: -0.01 }, 0.5, 'Screens the defence, adds little going forward.'),
    R('Deep-Lying Playmaker', { poss: 0.02, quality: 0.01, oppChance: 0.01 }, 0.6, 'Dictates from deep; easy to bypass.'),
    R('Box-to-Box', { chance: 0.015, oppChance: -0.01, fatigue: 0.15 }, 1.1, 'Covers everything; tires faster.'),
    R('Playmaker', { quality: 0.02, poss: 0.01, oppChance: 0.01 }, 0.9, 'Creates better chances; light defensively.'),
  ],
  CAM: [
    R('Playmaker', { quality: 0.02, poss: 0.01, oppChance: 0.01 }, 1.1, 'Creates better chances; light defensively.'),
    R('Shadow Striker', { quality: 0.02, chance: 0.01, poss: -0.01 }, 1.6, 'Arrives in the box; gives the ball away more.'),
  ],
  WIDE: [
    R('Winger', { chance: 0.02, quality: -0.005 }, 1.1, 'Stretches the pitch, lots of crosses.'),
    R('Inside Forward', { quality: 0.02, chance: 0.005, oppChance: 0.005 }, 1.5, 'Cuts inside to shoot.'),
  ],
  ST: [
    R('Advanced Forward', { chance: 0.02, quality: 0.01, fatigue: 0.1 }, 1.4, 'Runs in behind all match.'),
    R('Poacher', { quality: 0.04, chance: -0.01, poss: -0.015 }, 1.9, 'Deadly in the box, no help in build-up.'),
    R('Target Forward', { quality: 0.01, poss: -0.005, longBall: 0.08 }, 1.4, 'Wins headers; best with Long Ball.'),
    R('False 9', { poss: 0.02, chance: 0.01, quality: -0.01 }, 0.9, 'Drops deep to link play.'),
  ],
}

export function roleGroup(pos: Pos): keyof typeof ROLES {
  if (pos === 'GK' || pos === 'CB' || pos === 'CAM' || pos === 'ST') return pos
  if (['LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'FB'
  if (pos === 'CDM' || pos === 'CM') return 'CM'
  return 'WIDE'
}

export const rolesFor = (pos: Pos) => ROLES[roleGroup(pos)]
export const findRole = (pos: Pos, name: string) => rolesFor(pos).find((r) => r.name === name) ?? rolesFor(pos)[0]

export function defaultTactics(slots: Pos[]): Tactics {
  return {
    buildUp: 'Balanced',
    defence: 'Balanced',
    width: 5,
    line: 5,
    roles: slots.map((p) => ({ role: rolesFor(p)[0].name, focus: 0 })),
  }
}

// Style-level modifiers (before matchups).
export const BUILD_UP_MODS: Record<BuildUp, Mods> = {
  Balanced: {},
  'Short Passing': { poss: 0.07, chance: -0.08, quality: 0.1 },
  Counter: { poss: -0.08, chance: -0.05, quality: 0.12 },
  'Long Ball': { poss: -0.05, chance: 0.06, quality: -0.08 },
}
export const DEF_MODS: Record<DefApproach, Mods> = {
  Deep: { poss: -0.05, chance: -0.1, oppChance: -0.08, oppQuality: -0.1 },
  Balanced: {},
  High: { poss: 0.03, oppChance: -0.05, oppQuality: 0.05, fatigue: 0.1 },
  Aggressive: { poss: 0.05, oppChance: -0.08, oppQuality: 0.08, cards: 0.8, fatigue: 0.25 },
}

// Extra quality multiplier for MY build-up against THEIR defensive approach.
export const BUILD_VS_DEF: Record<BuildUp, Partial<Record<DefApproach, number>>> = {
  Balanced: {},
  'Short Passing': { Deep: 0.12, Aggressive: -0.12 },
  Counter: { High: 0.3, Aggressive: 0.22, Deep: -0.2 },
  'Long Ball': { High: 0.22, Deep: -0.12, Aggressive: 0.05 },
}
