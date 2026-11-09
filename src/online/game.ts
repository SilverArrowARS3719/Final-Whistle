import type { RealtimeChannel } from '@supabase/supabase-js'
import { diff, reviveDeep, setIn, type Op, type Store } from '../engine/persist'
import { supabase } from './supabase'

export type Seat = { id: string; username: string }
export type Reaction = { emoji: string; from: string; id: number }
export type GameRow = { id: string; code: string; host: string; mode: string; status: 'lobby' | 'playing' | 'finished'; players: Seat[]; state: Record<string, unknown> }

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function createGame(mode: string): Promise<GameRow> {
  const { data, error } = await supabase!.rpc('create_game', { p_mode: mode })
  fail(error)
  return data as GameRow
}
export async function joinByCode(code: string): Promise<GameRow> {
  const { data, error } = await supabase!.rpc('join_game', { p_code: code })
  fail(error)
  return data as GameRow
}
export async function leaveGame(id: string) {
  fail((await supabase!.rpc('leave_game', { p_game: id })).error)
}
export async function fetchGame(id: string): Promise<GameRow | null> {
  const { data } = await supabase!.from('games').select('*').eq('id', id).maybeSingle()
  return data as GameRow | null
}
export async function inviteToGame(gameId: string, from: string, to: string, mode?: string) {
  const { error } = await supabase!.from('game_invites').insert({ game_id: gameId, from_user: from, to_user: to, mode })
  if (error && error.code !== '23505') throw new Error(error.message) // already invited is fine
}
export async function recordResult(game: GameRow, winnerSeat: number) {
  await supabase!.from('results').insert({ game_id: game.id, mode: game.mode, winner: game.players[winnerSeat]?.id ?? null, players: game.players.map((p) => p.id) })
}

/** Games I'm in that haven't finished, newest first, so I can rejoin them. */
export async function myGames(me: string): Promise<GameRow[]> {
  const { data } = await supabase!.from('games').select('id, code, host, mode, status, players, updated_at')
    .neq('status', 'finished').contains('players', JSON.stringify([{ id: me }])).order('updated_at', { ascending: false }).limit(10)
  return (data ?? []) as unknown as GameRow[]
}

// Live updates for one row (lobby joins/leaves, start). Returns an unsubscribe.
export function watchGame(id: string, onChange: (g: GameRow | null) => void) {
  const ch = supabase!
    .channel(`row:${id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${id}` }, (p) =>
      onChange(p.eventType === 'DELETE' ? null : (p.new as GameRow)))
    .subscribe()
  return () => { supabase!.removeChannel(ch) }
}

// The shared game state. Every change is (1) applied here at once, (2) broadcast to the other players over a
// realtime channel (tens of ms), and (3) saved to the database so a refresh or late reconnect resumes it.
// shortcut: anyone in the game may write any key (fine between friends); add server-side turn checks before going public.
export class OnlineStore implements Store {
  canInit: boolean
  private state: Record<string, unknown>
  private known: Set<string>
  private subs = new Set<() => void>()
  private reactions = new Set<(r: Reaction) => void>()
  private queue: Op[] = []
  private channel: RealtimeChannel
  readonly gameId: string

  constructor(game: GameRow, isHost: boolean) {
    this.gameId = game.id
    this.canInit = isHost
    this.state = reviveDeep(game.state ?? {})
    this.known = new Set(Object.keys(this.state))
    this.channel = supabase!
      .channel(`game:${game.id}`, { config: { broadcast: { self: false, ack: false } } })
      .on('broadcast', { event: 'ops' }, ({ payload }) => this.apply(payload.ops as Op[], true))
      .on('broadcast', { event: 'react' }, ({ payload }) => this.reactions.forEach((f) => f(payload as Reaction)))
      .subscribe((status) => {
        // after a reconnect, pull the saved state in case we missed broadcasts
        if (status === 'SUBSCRIBED') this.resync()
      })
  }

  // a cleared key is stored as null (the server can only set paths), which reads as "never set"
  get(key: string) {
    return this.state[key] ?? undefined
  }

  clear(scope = '') {
    Object.keys(this.state).filter((k) => k.startsWith(scope) && this.state[k] != null).forEach((k) => this.set(k, null))
  }

  /** Emoji reactions are fire-and-forget: broadcast only, never saved. */
  react(emoji: string, from: string) {
    const r = { emoji, from, id: Math.random() }
    this.reactions.forEach((f) => f(r))
    this.channel.send({ type: 'broadcast', event: 'react', payload: r })
  }
  onReact(fn: (r: Reaction) => void) {
    this.reactions.add(fn)
    return () => { this.reactions.delete(fn) }
  }

  set(key: string, value: unknown) {
    const ops = this.known.has(key) ? diff(this.state[key], value, [key]) : [{ path: [key], value }]
    if (!ops.length) return
    this.known.add(key)
    this.apply(ops, false)
    if (!this.queue.length) queueMicrotask(() => this.flush()) // one message per user action
    this.queue.push(...ops)
  }

  subscribe(fn: () => void) {
    this.subs.add(fn)
    return () => { this.subs.delete(fn) }
  }

  destroy() {
    supabase!.removeChannel(this.channel)
  }

  private apply(ops: Op[], remote: boolean) {
    for (const op of ops) {
      if (remote) this.known.add(op.path[0])
      this.state = setIn(this.state, op.path, remote ? reviveDeep(op.value) : op.value) as Record<string, unknown>
    }
    this.subs.forEach((f) => f())
  }

  private flush() {
    const ops = JSON.parse(JSON.stringify(this.queue)) as Op[]
    this.queue = []
    this.channel.send({ type: 'broadcast', event: 'ops', payload: { ops } })
    supabase!.rpc('patch_game', { p_game: this.gameId, p_ops: ops }).then(({ error }) => {
      if (error) console.warn('Could not save move:', error.message)
    })
  }

  private async resync() {
    const g = await fetchGame(this.gameId)
    if (!g || this.queue.length) return
    this.state = reviveDeep(g.state ?? {})
    this.known = new Set(Object.keys(this.state))
    this.subs.forEach((f) => f())
  }
}
