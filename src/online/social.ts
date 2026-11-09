import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Person = { id: string; username: string }
export type Friendship = { id: number; status: 'pending' | 'accepted'; requester: Person; addressee: Person }
export type Invite = { id: number; game_id: string; from: Person; created_at: string }
export type Standing = { id: string; username: string; wins: number; played: number }

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function searchUsers(q: string, me: string): Promise<Person[]> {
  if (q.trim().length < 2) return []
  const { data } = await supabase!.from('profiles').select('id, username').ilike('username', `${q.trim()}%`).neq('id', me).limit(8)
  return (data ?? []) as Person[]
}
export async function sendFriendRequest(me: string, to: string) {
  const { error } = await supabase!.from('friendships').insert({ requester: me, addressee: to })
  if (error) throw new Error(error.code === '23505' ? 'You already have a request or friendship with them.' : error.message)
}
export const acceptRequest = async (id: number) => fail((await supabase!.from('friendships').update({ status: 'accepted' }).eq('id', id)).error)
export const removeFriendship = async (id: number) => fail((await supabase!.from('friendships').delete().eq('id', id)).error)
export const dismissInvite = async (id: number) => fail((await supabase!.from('game_invites').delete().eq('id', id)).error)
export async function codeForInvite(id: number): Promise<string> {
  const { data, error } = await supabase!.rpc('invite_code', { p_invite: id })
  fail(error)
  if (!data) throw new Error('That game no longer exists.')
  return data as string
}

// Friends, requests, invites and the friends leaderboard for the signed-in player, kept live.
export function useSocial(me: string | null) {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [board, setBoard] = useState<Standing[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabase || !me) return
    const [f, i, b] = await Promise.all([
      supabase.from('friendships').select('id, status, requester:profiles!friendships_requester_fkey(id, username), addressee:profiles!friendships_addressee_fkey(id, username)'),
      supabase.from('game_invites').select('id, game_id, created_at, from:profiles!game_invites_from_user_fkey(id, username)').eq('to_user', me).order('created_at', { ascending: false }),
      supabase.rpc('friends_leaderboard'),
    ])
    setFriendships((f.data ?? []) as unknown as Friendship[])
    setInvites((i.data ?? []) as unknown as Invite[])
    setBoard(((b.data ?? []) as Standing[]).map((s) => ({ ...s, wins: Number(s.wins), played: Number(s.played) })))
    setLoaded(true)
  }, [me])

  useEffect(() => {
    if (!supabase || !me) return
    refresh()
    const ch = supabase
      .channel(`social:${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites', filter: `to_user=eq.${me}` }, refresh)
      .subscribe()
    return () => { supabase!.removeChannel(ch) }
  }, [me, refresh])

  const other = (f: Friendship) => (f.requester.id === me ? f.addressee : f.requester)
  return {
    loaded,
    friends: friendships.filter((f) => f.status === 'accepted').map((f) => ({ ...other(f), friendship: f.id })),
    incoming: friendships.filter((f) => f.status === 'pending' && f.addressee.id === me),
    outgoing: friendships.filter((f) => f.status === 'pending' && f.requester.id === me),
    invites,
    board,
    refresh,
  }
}
