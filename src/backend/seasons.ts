import { supabase } from './supabase'

export type Season = { id: string; code: string; name: string; owner: string; starts_at: string; ends_at: string; members?: number }
export type SeasonRow = { user_id: string; username: string; played: number; wins: number; points: number; streak: number; best_streak: number; form: string; week_points: number }

const call = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const createSeason = (name: string) => call<Season>('create_season', { p_name: name })
export const joinSeason = (code: string) => call<Season>('join_season', { p_code: code })
export const addToSeason = (season: string, user: string) => call<void>('add_to_season', { p_season: season, p_user: user })
export const leaveSeason = (season: string) => call<void>('leave_season', { p_season: season })
export const mySeasons = () => call<Season[]>('my_seasons')

export type Honour = { season: number; username: string; wins: number; played: number }

/** One season's table, most wins first (then points, then fewer games). `index` 1 is the first year; omit for the current one. */
export async function seasonTable(league: string, index?: number) {
  const rows = (await call<SeasonRow[]>('season_table', { p_season: league, p_index: index ?? null })) ?? []
  return rows.sort((a, b) => b.wins - a.wins || b.points - a.points || a.played - b.played || a.username.localeCompare(b.username))
}
export const leagueHonours = (league: string) => call<Honour[]>('league_honours', { p_season: league })

// Seasons are one year each, counted from the day the league started.
const YEAR = 365.25 * 86_400_000
export const currentSeason = (l: Season) => Math.max(1, Math.floor((Date.now() - new Date(l.starts_at).getTime()) / YEAR) + 1)
export const seasonEnds = (l: Season, index = currentSeason(l)) => new Date(new Date(l.starts_at).getTime() + index * YEAR)
export const daysLeft = (l: Season) => Math.ceil((seasonEnds(l).getTime() - Date.now()) / 86_400_000)
