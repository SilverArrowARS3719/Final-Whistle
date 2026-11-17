import { supabase } from './supabase'
import { fail } from './errors'

/** Sends one piece of feedback. The database adds who sent it (if signed in) and limits how often. */
export async function sendFeedback(f: { name: string; message: string; screen?: string; version: string }) {
  if (!supabase) throw new Error('Sending feedback needs the online version of the game.')
  const { error } = await supabase.rpc('send_feedback', { p_name: f.name, p_message: f.message, p_screen: f.screen ?? null, p_version: f.version })
  fail(error)
}

// ---------- asking now and then ----------
// First ask after the 3rd finished game, then at most every 10 days and 5 games. "Don't ask again" is final.
const KEY = 'fw-feedback-ask'
export type Ask = { last: number; games: number; never: boolean }
const DAY = 86_400_000

export function askDue(a: Ask, played: number, now = Date.now()) {
  if (a.never || played < 3) return false
  if (!a.last) return true
  return now - a.last >= 10 * DAY && played - a.games >= 5
}
export const loadAsk = (): Ask => {
  try { return { last: 0, games: 0, never: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { last: 0, games: 0, never: false } }
}
export const saveAsk = (a: Ask) => { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* asked again next time */ } }
