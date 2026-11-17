import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, WifiHigh } from '@phosphor-icons/react'
import App from './App'
import { APP_NAME } from '../game/engine/config'
import { DEFAULT_CHAOS_SETTINGS } from '../game/engine/chaos'
import { localStore, StoreContext } from '../game/engine/persist'
import { signOut, useAccount } from '../backend/auth'
import { OnlineContext, type OnlineInfo } from './online'
import { createGame, fetchGame, inviteToGame, joinByCode, leaveGame, OnlineStore, recordResult, watchGame, type GameRow } from '../backend/game'
import { useSocial } from '../backend/social'
import { setTrackedUser } from '../backend/track'
import { onlineReady } from '../backend/supabase'
import Login, { openLoginOn } from './screens/Login'
import Reactions from './components/Reactions'
import Coach from './components/Coach'
import { LogoMark } from './components/Logo'
import { HelpButton } from './components/AccountMenu'
import { BootSkeleton, PageSkeleton } from './components/Skeleton'

// the social screens load on demand: most visits never open them
const Friends = lazy(() => import('./screens/Friends'))
const Lobby = lazy(() => import('./screens/Lobby'))
const Seasons = lazy(() => import('./screens/Seasons'))

const SAVED = 'fw-online-game' // the online game this device is part of, so a refresh rejoins it
const saved = { get: () => { try { return localStorage.getItem(SAVED) } catch { return null } }, set: (id: string | null) => { try { if (id) localStorage.setItem(SAVED, id); else localStorage.removeItem(SAVED) } catch { /* not remembered */ } } }

type View = 'app' | 'friends' | 'lobby' | 'leagues'

export default function Root() {
  const { session, account, setAccount, loading } = useAccount()
  const social = useSocial(account?.id ?? null)
  const [view, setView] = useState<View>('app')
  const [lobby, setLobby] = useState<GameRow | null>(null)
  const [online, setOnline] = useState<{ game: GameRow; store: OnlineStore } | null>(null)
  const [pending, setPending] = useState<string | null>(saved.get) // an online game we left to look around
  const [notice, setNotice] = useState('')
  useEffect(() => setTrackedUser(account?.id ?? null), [account?.id])

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
  // a league game: one online game, everyone in the league invited
  const playLeague = async (memberIds: string[], mode: string) => {
    const g = await createGame(mode)
    await Promise.all(memberIds.map((id) => inviteToGame(g.id, account!.id, id, mode).catch(() => {})))
    open(g)
  }
  const challenge = async (friendId: string, mode: string) => {
    const g = await createGame(mode)
    await inviteToGame(g.id, account!.id, friendId, mode)
    open(g)
  }

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

  if (onlineReady && loading) return <BootSkeleton />

  // signed in but no username yet
  if (onlineReady && session && !loading && !account)
    return (
      <div className="shell">
        <Login onDone={() => {}} onAccount={setAccount} pickUsernameFor={session.user.id} />
      </div>
    )

  if ((view === 'leagues' || view === 'friends') && !account)
    return (
      <div className="shell">
        <header className="topbar">
          <div className="row" style={{ gap: 14 }}>
            <button className="btn ghost sm" onClick={() => setView('app')}><ArrowLeft weight="bold" /> Back</button>
            <span className="wordmark"><LogoMark />{APP_NAME.split(' ')[0]} <i>{APP_NAME.split(' ').slice(1).join(' ')}</i></span>
          </div>
        </header>
        <NeedAccount what={view} onLogin={(m) => { openLoginOn(m); localStore.set('screen', 'login'); setView('app') }} />
      </div>
    )

  if (view !== 'app' && account)
    return (
      <div className="shell">
        <header className="topbar social-head">
          <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
            {(view === 'friends' || view === 'leagues') && <button className="btn ghost sm tb-btn" onClick={() => setView('app')} aria-label="Back"><ArrowLeft weight="bold" /> <span className="tb-label">Back</span></button>}
            {(view === 'friends' || view === 'leagues') && <nav className="social-tabs" aria-label="Social"><button className={view === 'leagues' ? 'on' : ''} onClick={() => setView('leagues')}>Leagues</button><button className={view === 'friends' ? 'on' : ''} onClick={() => setView('friends')}>Friends{social.invites.length + social.incoming.length > 0 && <span className="badge num">{social.invites.length + social.incoming.length}</span>}</button></nav>}
            <span className="wordmark"><LogoMark />{APP_NAME.split(' ')[0]} <i>{APP_NAME.split(' ').slice(1).join(' ')}</i></span>
          </div>
          <div className="me"><HelpButton /></div>
        </header>
        <Coach screen={view} />
        <Suspense fallback={<PageSkeleton />}>
        {view === 'friends' && <Friends me={account} social={social} onJoin={join} onChallenge={challenge} onRejoin={open} onSeasons={() => setView('leagues')} />}
        {view === 'leagues' && <Seasons me={account} friends={social.friends} onPlay={playLeague} />}
        {view === 'lobby' && lobby && (
          <Lobby
            game={lobby}
            me={account.id}
            friends={social.friends}
            onInvite={(id) => inviteToGame(lobby.id, account.id, id, lobby.mode)}
            onStart={start}
            onLeave={() => { leaveGame(lobby.id); setLobby(null); saved.set(null); setPending(null); setView('app') }}
          />
        )}
        </Suspense>
      </div>
    )

  return (
    <StoreContext.Provider value={online?.store ?? localStore}>
      <OnlineContext.Provider value={info}>
        <App
          key={online?.game.id ?? 'local'}
          account={account}
          invites={social.invites.length + social.incoming.length}
          onFriends={() => setView('friends')}
          onLeagues={() => setView('leagues')}
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
        {online && account && <Reactions store={online.store} me={account.username} />}
      </OnlineContext.Provider>
    </StoreContext.Provider>
  )
}

/** Leagues and friends live on the server, so they need an account. Say so instead of hiding the tab. */
function NeedAccount({ what, onLogin }: { what: 'leagues' | 'friends'; onLogin: (mode: 'create' | 'login') => void }) {
  return (
    <div className="need-account panel pad stack">
      <h2>{what === 'leagues' ? 'Leagues' : 'Friends'}</h2>
      <p className="dim">
        {what === 'leagues'
          ? 'A league is your group of mates. Send the code and anyone can join. Play as many games as you like: each season lasts a year, and whoever wins the most is champion.'
          : 'Find other players by username, add them as friends, and challenge them to any mode.'}
      </p>
      <p className="dim small">{onlineReady ? 'You need an account for this. New here? Create one in a few seconds. Already have one, maybe on another device? Log in.' : 'Online play is being set up. Once it is on, create an account or log in with Google, Microsoft or email.'}</p>
      <div className="row">
        <button className="btn primary lg" onClick={() => onLogin('create')}>Create account</button>
        <button className="btn lg" onClick={() => onLogin('login')}>Log in</button>
      </div>
    </div>
  )
}
