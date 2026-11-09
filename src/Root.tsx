import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, WifiHigh } from '@phosphor-icons/react'
import App from './App'
import { APP_NAME } from './engine/config'
import { DEFAULT_CHAOS_SETTINGS } from './engine/chaos'
import { localStore, StoreContext } from './engine/persist'
import { signOut, useAccount } from './online/auth'
import { OnlineContext, type OnlineInfo } from './online/context'
import { createGame, fetchGame, inviteToGame, joinByCode, leaveGame, OnlineStore, recordResult, watchGame, type GameRow } from './online/game'
import { useSocial } from './online/social'
import { onlineReady } from './online/supabase'
import Friends from './screens/Friends'
import Lobby from './screens/Lobby'
import Login from './screens/Login'

const SAVED = 'fw-online-game' // the online game this device is part of, so a refresh rejoins it
const saved = { get: () => { try { return localStorage.getItem(SAVED) } catch { return null } }, set: (id: string | null) => { try { if (id) localStorage.setItem(SAVED, id); else localStorage.removeItem(SAVED) } catch { /* not remembered */ } } }

type View = 'app' | 'friends' | 'lobby'

export default function Root() {
  const { session, account, setAccount, loading } = useAccount()
  const social = useSocial(account?.id ?? null)
  const [view, setView] = useState<View>('app')
  const [lobby, setLobby] = useState<GameRow | null>(null)
  const [online, setOnline] = useState<{ game: GameRow; store: OnlineStore } | null>(null)
  const [pending, setPending] = useState<string | null>(saved.get) // an online game we left to look around
  const [notice, setNotice] = useState('')

  const enter = useCallback((g: GameRow) => {
    setOnline((cur) => {
      cur?.store.destroy()
      return { game: g, store: new OnlineStore(g, g.host === account?.id) }
    })
    setLobby(null)
    setPending(g.id)
    saved.set(g.id)
    setView('app')
  }, [account?.id])

  const open = useCallback((g: GameRow) => {
    saved.set(g.id)
    setPending(g.id)
    if (g.status === 'lobby') { setLobby(g); setView('lobby') } else enter(g)
  }, [enter])

  // after a refresh: rejoin the online game this device was in
  useEffect(() => {
    const id = saved.get()
    if (!account || !id || online || lobby) return
    fetchGame(id).then((g) => {
      if (g && g.status !== 'finished') open(g)
      else { saved.set(null); setPending(null) }
    })
  }, [account]) // eslint-disable-line react-hooks/exhaustive-deps

  // lobby updates: players joining/leaving, the host starting, the host cancelling
  useEffect(() => {
    if (!lobby) return
    return watchGame(lobby.id, async (g) => {
      if (!g) { setLobby(null); setView('app'); saved.set(null); setPending(null); setNotice('The host cancelled that game.'); return }
      if (g.status === 'playing') enter((await fetchGame(g.id)) ?? g)
      else setLobby(g)
    })
  }, [lobby?.id, enter]) // eslint-disable-line react-hooks/exhaustive-deps

  const playOnline = async (mode: string) => {
    try { open(await createGame(mode)) } catch (e) { setNotice((e as Error).message) }
  }
  const join = async (code: string) => open(await joinByCode(code))

  const start = () => {
    if (!lobby) return
    const g = lobby
    const store = new OnlineStore(g, true)
    // everyone's names come from the lobby; seats are the lobby order, so team i belongs to player i
    const init: Record<string, unknown> = {
      names: g.players.map((p) => p.username), mode: g.mode, order: [], teams: [], pickNo: 0, fixtures: [], resume: null,
      chaosSettings: DEFAULT_CHAOS_SETTINGS, auctionKind: 'classic', screen: 'spinner',
    }
    Object.entries(init).forEach(([k, v]) => store.set(k, v))
    setOnline({ game: g, store })
    setLobby(null)
    setView('app')
  }

  const leaveOnline = (forGood: boolean) => {
    online?.store.destroy()
    setOnline(null)
    if (forGood) { saved.set(null); setPending(null) }
  }

  const info: OnlineInfo = useMemo(() => online && account
    ? { online: true, mySeat: online.game.players.findIndex((p) => p.id === account.id), isHost: online.game.host === account.id, names: online.game.players.map((p) => p.username) }
    : { online: false, mySeat: -1, isHost: true, names: [] }, [online, account])

  if (onlineReady && loading) return <div className="boot" role="status" aria-label="Loading"><span className="spin lg" /></div>

  // signed in but no username yet
  if (onlineReady && session && !loading && !account)
    return (
      <div className="shell">
        <header className="topbar"><span className="wordmark">{APP_NAME.split(' ')[0]} <i>{APP_NAME.split(' ').slice(1).join(' ')}</i></span></header>
        <Login onDone={() => {}} onAccount={setAccount} pickUsernameFor={session.user.id} />
      </div>
    )

  if (view !== 'app' && account)
    return (
      <div className="shell">
        <header className="topbar">
          <div className="row" style={{ gap: 14 }}>
            {view === 'friends' && <button className="btn ghost sm" onClick={() => setView('app')}><ArrowLeft weight="bold" /> Back</button>}
            <span className="wordmark">{APP_NAME.split(' ')[0]} <i>{APP_NAME.split(' ').slice(1).join(' ')}</i></span>
          </div>
        </header>
        {view === 'friends' && <Friends me={account} social={social} onJoin={join} />}
        {view === 'lobby' && lobby && (
          <Lobby
            game={lobby}
            me={account.id}
            friends={social.friends}
            onInvite={(id) => inviteToGame(lobby.id, account.id, id)}
            onStart={start}
            onLeave={() => { leaveGame(lobby.id); setLobby(null); saved.set(null); setPending(null); setView('app') }}
          />
        )}
      </div>
    )

  return (
    <StoreContext.Provider value={online?.store ?? localStore}>
      <OnlineContext.Provider value={info}>
        <App
          key={online?.game.id ?? 'local'}
          account={account}
          invites={social.invites.length + social.incoming.length}
          onFriends={account ? () => setView('friends') : undefined}
          onPlayOnline={account ? playOnline : undefined}
          onLeaveOnline={online ? leaveOnline : undefined}
          onRecordResult={online && info.isHost ? (seat) => recordResult(online.game, seat) : undefined}
          onSignOut={account ? () => { leaveOnline(true); signOut() } : undefined}
        />
        {!online && pending && account && (
          <button className="btn primary online-pill" onClick={async () => { const g = await fetchGame(pending); if (g && g.status !== 'finished') open(g); else { saved.set(null); setPending(null) } }}>
            <WifiHigh weight="bold" /> Back to your online game
          </button>
        )}
        {notice && <p className="online-pill toast" role="status" onClick={() => setNotice('')}>{notice}</p>}
      </OnlineContext.Provider>
    </StoreContext.Provider>
  )
}
