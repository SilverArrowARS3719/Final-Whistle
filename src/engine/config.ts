// Every tunable number in the game lives here.
import type { Pos } from '../data/players'

export const APP_NAME = 'The Draft Room'
export const GAME_NAME = 'All-Time XI' // Game Mode 1
export const PICK_SECONDS = 30
export const AUTOPICK_MAX_OVR = 79 // "below 80"
export const BENCH_SIZE = 3
export const MATCH_PLAYBACK_MS = 30_000

// Stick or Twist
export const SOT = { capMargin: 2.25, twists: 5, decisionSeconds: 15, perfectWindow: 5, bustReplaceMax: 74 }
// Chaos Draft
export const CHAOS = {
  weights: { common: 0.6, rare: 0.3, legendary: 0.1 },
  speedSeconds: 10, maxWild: 3, maxLegendary: 1, minValid: 3, redraws: 10, sensiblePenalty: 20,
  eventChance: 0.2, maxEvents: 2, // table cards (reverse, shield, pass it on) per game
}
// Auction (budgets in £M)
export const AUCTION = { budgetPer5: 20, minBid: 0.5, step: 0.5, maxUnsoldInARow: 3, leftoverMax: 74 }

// Out-of-position penalty: depth + side model.
export const POS_GEOM: Record<Exclude<Pos, 'GK'>, { depth: number; side: number }> = {
  CB: { depth: 0, side: 0 }, LB: { depth: 0.3, side: -1 }, RB: { depth: 0.3, side: 1 },
  LWB: { depth: 0.8, side: -1 }, RWB: { depth: 0.8, side: 1 },
  CDM: { depth: 1, side: 0 }, CM: { depth: 1.5, side: 0 },
  LM: { depth: 1.7, side: -1 }, RM: { depth: 1.7, side: 1 },
  CAM: { depth: 2, side: 0 }, LW: { depth: 2.5, side: -1 }, RW: { depth: 2.5, side: 1 },
  ST: { depth: 3, side: 0 },
}
export const PENALTY = {
  perDepth: 5.5,
  perSide: 0.75,
  outfieldInGoal: 40,
  keeperOutfield: 35,
  secondaryMax: 1, // listed secondary position costs at most this
}

// Chemistry: link points per teammate, then boost = min(max, floor(points / per)).
export const CHEM = { club: 3, nation: 2, league: 1, era: 1, pointsPerBoost: 10, maxBoost: 3 }

// Match simulation base rates (per minute).
export const SIM = {
  chanceRate: 0.2, // chance per minute of possession
  goalQuality: 0.16, // base goal probability per chance
  attVsDefK: 0.012, // exp(k * rating gap) for chance volume
  shotVsKeeperK: 0.012, // exp(k * gap) for conversion (shooter vs keeper)
  midPossK: 0.006, // possession per point of midfield gap
  keeperHowlerBelow: 70,
  keeperHowlerK: 0.05,
  bigChance: 0.24, // chance quality counted as a "big chance"
  yellowRate: 0.019, // x match 'heat' 0.45-1.55: about 1.5 to 5 yellows a game
  straightRedRate: 0.0007,
  redCardHit: { chance: 0.82, oppChance: 1.2, poss: -0.06 },
  fatiguePerMin: 0.38,
  fatigueOvrStart: 72, // below this fitness the player loses OVR
  fatigueOvrK: 0.2,
  subWindow: [58, 82] as [number, number],
  subMaxDrop: 8, // a tired starter is only replaced by a sub at most this much worse
  penBase: 0.76,
  penK: 0.006,
}
