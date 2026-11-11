// Anonymous usage tracking. Each browser gets a random id (no names, no emails); events go to the
// Supabase `events` table when online is set up, and the last 2,000 also stay on this device so the
// Insights page works offline too. Players can switch it off in Settings.
import { supabase } from './supabase'
import { addDays, dayKey } from '../engine/daily'

export type Ev = { name: string; device: string; session: string; user_id?: string | null; at: string; props?: Record<string, unknown> }

const DEVICE = 'fw-device', FIRST = 'fw-first-seen', LOCAL = 'fw-events', OPT_OUT = 'fw-no-tracking'
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
  del: (k: string) => { try { localStorage.removeItem(k) } catch { /* private mode */ } },
}
const uid = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)

export const deviceId = (() => { const d = ls.get(DEVICE) ?? uid(); ls.set(DEVICE, d); return d })()
const firstSeen = (() => { const f = ls.get(FIRST) ?? new Date().toISOString(); ls.set(FIRST, f); return f })()
const session = uid()
const started = Date.now()
let userId: string | null = null
let lastScreen = ''
let queue: Ev[] = []

export const trackingOn = () => ls.get(OPT_OUT) !== '1'
export function setTracking(on: boolean) {
  if (on) ls.del(OPT_OUT)
  else { ls.set(OPT_OUT, '1'); queue = [] }
}
export const setTrackedUser = (id: string | null) => { userId = id }

export function localEvents(): Ev[] {
  try { return JSON.parse(ls.get(LOCAL) ?? '[]') } catch { return [] }
}

export function track(name: string, props?: Record<string, unknown>) {
  if (!trackingOn()) return
  const ev: Ev = { name, device: deviceId, session, user_id: userId, at: new Date().toISOString(), props }
  if (name === 'screen') lastScreen = String(props?.screen ?? '')
  ls.set(LOCAL, JSON.stringify([...localEvents(), ev].slice(-2000)))
  if (supabase) queue.push(ev)
}

async function flush() {
  if (!supabase || !queue.length) return
  const batch = queue
  queue = []
  const { error } = await supabase.from('events').insert(batch)
  if (error) queue = [...batch, ...queue].slice(-500) // try again on the next tick
}

// On the way out the page may be gone before a normal request finishes, so the last batch goes as keepalive.
function flushOnExit() {
  if (!trackingOn()) return
  track('session_end', { seconds: Math.round((Date.now() - started) / 1000), last: lastScreen })
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined, key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key || !queue.length) return
  fetch(`${url}/rest/v1/events`, { method: 'POST', keepalive: true, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(queue) }).catch(() => {})
  queue = []
}

export function startTracking() {
  const days = Math.floor((Date.now() - Date.parse(firstSeen)) / 86_400_000)
  track('app_open', { returning: days > 0 || localEvents().some((e) => e.name === 'session_end'), days_since_first: days, w: window.innerWidth, ref: document.referrer ? new URL(document.referrer).hostname : '' })
  setInterval(flush, 8000)
  addEventListener('pagehide', flushOnExit)
}

// ---------- the numbers on the Insights page ----------
// calendar days in the viewer's own time zone, so "today" means today where you are
const day = (iso: string) => dayKey(new Date(iso))
const addDay = addDays

export type Summary = {
  players: number // distinct devices
  accounts: number
  today: number
  daily: { day: string; active: number; fresh: number }[] // last 14 days
  d1: number | null; d7: number | null // share of new players who came back the next day / a week later
  avgMinutes: number
  sessions: number
  modes: { mode: string; started: number; finished: number }[]
  dropOff: { screen: string; sessions: number }[] // where sessions that never finished a game ended
  dailyDraft: { players: number; avgPoints: number }
}

export function summarise(events: Ev[], now = new Date().toISOString()): Summary {
  const byDevice = new Map<string, Set<string>>()
  const first = new Map<string, string>()
  for (const e of events) {
    const d = day(e.at)
    if (!byDevice.has(e.device)) byDevice.set(e.device, new Set())
    byDevice.get(e.device)!.add(d)
    if (!first.has(e.device) || d < first.get(e.device)!) first.set(e.device, d)
  }
  const today = day(now)
  const daily = Array.from({ length: 14 }, (_, i) => addDay(today, i - 13)).map((d) => ({
    day: d,
    active: [...byDevice.values()].filter((s) => s.has(d)).length,
    fresh: [...first.values()].filter((f) => f === d).length,
  }))
  const retention = (n: number) => {
    const cohort = [...first.entries()].filter(([, f]) => addDay(f, n) <= today)
    if (!cohort.length) return null
    return cohort.filter(([dev, f]) => byDevice.get(dev)!.has(addDay(f, n))).length / cohort.length
  }
  const ends = events.filter((e) => e.name === 'session_end')
  const finishedSessions = new Set(events.filter((e) => e.name === 'game_done' || e.name === 'daily_done').map((e) => e.session))
  const drop = new Map<string, number>()
  ends.filter((e) => !finishedSessions.has(e.session)).forEach((e) => { const s = String(e.props?.last || 'landing'); drop.set(s, (drop.get(s) ?? 0) + 1) })
  const modeCount = (name: string) => {
    const m = new Map<string, number>()
    events.filter((e) => e.name === name).forEach((e) => { const k = String(e.props?.mode); m.set(k, (m.get(k) ?? 0) + 1) })
    return m
  }
  const started = modeCount('mode_start'), finished = modeCount('game_done')
  const dailies = events.filter((e) => e.name === 'daily_done')
  return {
    players: byDevice.size,
    accounts: new Set(events.map((e) => e.user_id).filter(Boolean)).size,
    today: daily[13].active,
    daily,
    d1: retention(1),
    d7: retention(7),
    sessions: new Set(events.map((e) => e.session)).size,
    avgMinutes: ends.length ? ends.reduce((s, e) => s + Number(e.props?.seconds ?? 0), 0) / ends.length / 60 : 0,
    modes: [...new Set([...started.keys(), ...finished.keys()])].map((mode) => ({ mode, started: started.get(mode) ?? 0, finished: finished.get(mode) ?? 0 })).sort((a, b) => b.started - a.started),
    dropOff: [...drop.entries()].map(([screen, sessions]) => ({ screen, sessions })).sort((a, b) => b.sessions - a.sessions).slice(0, 6),
    dailyDraft: { players: new Set(dailies.map((e) => e.device)).size, avgPoints: dailies.length ? dailies.reduce((s, e) => s + Number(e.props?.points ?? 0), 0) / dailies.length : 0 },
  }
}

/** Everyone's events (owner only: the database refuses anyone else). */
export async function fetchAllEvents(days = 30): Promise<Ev[]> {
  if (!supabase) throw new Error('Online play is not set up, so there is only this device’s data.')
  const { data, error } = await supabase.rpc('admin_events', { p_days: days })
  if (error) throw new Error(error.message.includes('not allowed') ? 'Only the owner account can see everyone’s data.' : error.message)
  return data as Ev[]
}
