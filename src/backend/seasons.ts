import { supabase } from './supabase'

export type Season = { id: string; code: string; name: string; owner: string; starts_at: string; ends_at: string; members?: number }
export type SeasonRow = { user_id: string; username: string; played: number; wins: number; points: number; streak: number; best_streak: number; form: string; week_points: number }

const call = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase!.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const createSeason = (name: string, weeks: number) => call<Season>('create_season', { p_name: name, p_weeks: weeks })
export const joinSeason = (code: string) => call<Season>('join_season', { p_code: code })
export const addToSeason = (season: string, user: string) => call<void>('add_to_season', { p_season: season, p_user: user })
export const leaveSeason = (season: string) => call<void>('leave_season', { p_season: season })
export const mySeasons = () => call<Season[]>('my_seasons')

/** Sorted league table: points, then wins, then fewer games played. */
export async function seasonTable(season: string) {
  const rows = (await call<SeasonRow[]>('season_table', { p_season: season })) ?? []
  return rows.sort((a, b) => b.points - a.points || b.wins - a.wins || a.played - b.played || a.username.localeCompare(b.username))
}

export const daysLeft = (s: Season) => Math.ceil((new Date(s.ends_at).getTime() - Date.now()) / 86_400_000)
