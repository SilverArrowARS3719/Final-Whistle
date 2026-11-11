import type { Player, Pos } from '../players'
import { COMPETITIONS } from './competitions'
import { ENGLAND } from './squads/england'
import { EUROPE } from './squads/europe'
import { REST } from './squads/rest'
import { NATIONS } from './squads/nations'
import type { SquadRow } from './types'

export { COMPETITIONS, type Competition } from './competitions'

export type WinnerTeam = { id: string; name: string; kind: 'club' | 'nation'; league: string; colors: [string, string] }

// Colour chips stand in for badges (no club crests, for licensing).
const CLUBS: [string, string, string, string, string][] = [
  ['arsenal', 'Arsenal', 'Premier League', '#db0007', '#ffffff'], ['man-city', 'Manchester City', 'Premier League', '#6cabdd', '#1c2c5b'],
  ['chelsea', 'Chelsea', 'Premier League', '#034694', '#ffffff'], ['aston-villa', 'Aston Villa', 'Premier League', '#670e36', '#95bfe5'],
  ['crystal-palace', 'Crystal Palace', 'Premier League', '#1b458f', '#c4122e'], ['psg', 'Paris Saint-Germain', 'Ligue 1', '#004170', '#da291c'],
  ['lens', 'Lens', 'Ligue 1', '#ffd700', '#e30613'], ['barcelona', 'Barcelona', 'La Liga', '#a50044', '#004d98'],
  ['real-sociedad', 'Real Sociedad', 'La Liga', '#0067b1', '#ffffff'], ['inter', 'Inter', 'Serie A', '#0068a8', '#000000'],
  ['napoli', 'Napoli', 'Serie A', '#12a0d7', '#ffffff'], ['bayern', 'Bayern Munich', 'Bundesliga', '#dc052d', '#ffffff'],
  ['psv', 'PSV', 'Eredivisie', '#ed1c24', '#ffffff'], ['az', 'AZ', 'Eredivisie', '#e30613', '#ffffff'],
  ['porto', 'Porto', 'Liga Portugal', '#003893', '#ffffff'], ['torreense', 'Torreense', 'Liga Portugal 2', '#00843d', '#ffffff'],
  ['vitoria-guimaraes', 'Vitória de Guimarães', 'Liga Portugal', '#ffffff', '#000000'], ['galatasaray', 'Galatasaray', 'Süper Lig', '#a90432', '#fdb912'],
  ['trabzonspor', 'Trabzonspor', 'Süper Lig', '#8b1538', '#4fa1db'], ['fenerbahce', 'Fenerbahçe', 'Süper Lig', '#163962', '#ffed00'],
  ['al-nassr', 'Al-Nassr', 'Saudi Pro League', '#fcd116', '#1e3a8a'], ['al-hilal', 'Al-Hilal', 'Saudi Pro League', '#0f4bad', '#ffffff'],
  ['al-ahli', 'Al-Ahli', 'Saudi Pro League', '#006a4e', '#ffffff'], ['flamengo', 'Flamengo', 'Brasileirão', '#c4161c', '#000000'],
  ['corinthians', 'Corinthians', 'Brasileirão', '#ffffff', '#000000'],
]
const NATION_TEAMS: [string, string, string, string][] = [
  ['spain', 'Spain', '#c60b1e', '#ffc400'], ['argentina', 'Argentina', '#75aadb', '#ffffff'],
  ['morocco', 'Morocco', '#c1272d', '#006233'], ['portugal', 'Portugal', '#006600', '#ff0000'],
]
export const TEAMS: Record<string, WinnerTeam> = Object.fromEntries([
  ...CLUBS.map(([id, name, league, a, b]): [string, WinnerTeam] => [id, { id, name, kind: 'club', league, colors: [a, b] }]),
  ...NATION_TEAMS.map(([id, name, a, b]): [string, WinnerTeam] => [id, { id, name, kind: 'nation', league: 'International', colors: [a, b] }]),
])

const key = (name: string, nation: string) => `${name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}|${nation}`

// Ids start at 10,000 so they never collide with the legends database (saved games revive players by id).
export const WINNER_PLAYERS: Player[] = []
const squads: Record<string, Player[]> = {}
const byKey = new Map<string, Player>()
const make = (team: WinnerTeam, [name, ovr, pos, nation]: SquadRow): Player => {
  const p: Player = {
    id: 10_000 + WINNER_PLAYERS.length, name, ovr, nation, era: '20s', wc: false,
    positions: pos.split(/[,/]/).map((s) => s.trim()) as Pos[],
    clubs: team.kind === 'club' ? [team.name] : [], leagues: team.kind === 'club' ? [team.league] : [],
  }
  WINNER_PLAYERS.push(p)
  return p
}
for (const [id, rows] of Object.entries({ ...ENGLAND, ...EUROPE, ...REST })) {
  squads[id] = rows.map((r) => {
    const p = make(TEAMS[id], r)
    byKey.set(key(r[0], r[3]), p)
    return p
  })
}
// national squads reuse the club player when he's already in the data
for (const [id, rows] of Object.entries(NATIONS)) {
  squads[id] = rows.map((r) => byKey.get(key(r[0], r[3])) ?? make(TEAMS[id], r))
}

export const squadOf = (teamId: string): Player[] => squads[teamId] ?? []
export const teamOfComp = (compId: string) => TEAMS[COMPETITIONS.find((c) => c.id === compId)!.winner]
