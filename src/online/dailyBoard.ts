import type { DailyResult } from '../engine/daily'
import { supabase } from './supabase'

export type BoardRow = { username: string; points: number; gd: number; rating: number; friend: boolean; me: boolean }

/** One result per account per day; the database keeps the first. */
export async function submitDaily(day: string, r: DailyResult) {
  if (!supabase) return
  await supabase.from('daily_results').insert({ day, points: r.points, gf: r.gf, ga: r.ga, rating: r.rating })
}

export async function dailyBoard(day: string): Promise<BoardRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('daily_board', { p_day: day })
  if (error) throw new Error(error.message)
  return data as BoardRow[]
}
