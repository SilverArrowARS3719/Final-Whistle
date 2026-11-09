import { useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SMALL_SIDED } from './data/formations'
import { AnimatePresence, motion } from 'motion/react'
import { PLAYERS, type Player } from './data/players'
import { drafterAt, fillBench, newTeam, roundOf, slotsOf, type Team } from './engine/draft'
import { effectiveOvr } from './engine/position'
import { makeRng } from './engine/rng'
import { simulateMatch, type MatchResult } from './engine/sim'
import type { Tactics } from './engine/tactics'
import { champion, makeFixtures, nextFixtures, type Fixture } from './engine/tournament'
import Landing, { type Mode } from './screens/Landing'
import Login, { loadProfile, saveProfile, type Profile } from './screens/Login'
import { SignOut, UsersThree, WifiHigh } from '@phosphor-icons/react'
import type { Account } from './online/auth'
import { HostOnly, useOnline } from './online/context'
import StickOrTwist from './screens/StickOrTwist'
import ChaosDraft from './screens/ChaosDraft'
import ChaosSettingsPanel from './components/ChaosSettings'
import Auction from './screens/Auction'
import type { AuctionKind } from './engine/auction'
import SizePick from './screens/SizePick'
import { DEFAULT_CHAOS_SETTINGS, type ChaosSettings } from './engine/chaos'
import Home from './screens/Home'
import { SotHero, ChaosHero, AuctionHero } from './screens/ModeHeroes'
import { ArrowLeft, House } from '@phosphor-icons/react'
import { StoreContext, usePersist } from './engine/persist'
import { APP_NAME } from './engine/config'
import Setup from './screens/Setup'
import Spinner from './screens/Spinner'
import FormationPick from './screens/FormationPick'
import Draft from './screens/Draft'
import Handover from './screens/Handover'
import DraftDone from './screens/DraftDone'
import TacticsScreen from './screens/Tactics'
import Match from './screens/Match'
import Tournament from './screens/Tournament'

const MODE_NAMES: Record<Mode, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction' }

type Screen = 'login' | 'modes' | 'home' | 'setup' | 'spinner' | 'formation' | 'size' | 'draft' | 'handover' | 'modedraft' | 'done' | 'tournament' | 'tactics' | 'match'

// Where Back goes from each pre-draft step. Once picks start, leaving needs the logo (with a confirm).
const BACK: Partial<Record<Screen, Screen>> = { home: 'modes', setup: 'home', spinner: 'setup', formation: 'spinner', size: 'spinner' }

type Props = {
  account: Account | null
  invites: number // friend requests + game invites waiting
  onFriends?: () => void
  onPlayOnline?: (mode: Mode) => void
  onLeaveOnline?: (forGood: boolean) => void
  onRecordResult?: (winnerSeat: number) => void
  onSignOut?: () => void
}

export default function App({ account, invites, onFriends, onPlayOnline, onLeaveOnline, onRecordResult, onSignOut }: Props) {
  const online = !!onLeaveOnline
  const store = useContext(StoreContext)
  const seat = useOnline()
  const [profile, setProfile] = useState<Profile | null>(loadProfile)
  // a match replay isn't saved, so a refresh during one goes back to its tactics screen
  const [screen, setScreen] = usePersist<Screen>('screen', () => (loadProfile() ? 'modes' : 'login'))
  const [names, setNames] = usePersist<string[]>('names', [])
  const [order, setOrder] = usePersist<number[]>('order', [])
  const [teams, setTeams] = usePersist<Team[]>('teams', [])
  const [pickNo, setPickNo] = usePersist('pickNo', 0)
  const [fixtures, setFixtures] = usePersist<Fixture[]>('fixtures', [])
  // a match is shared as its seed; every device replays the identical match from it
  const [matchSeed, setMatchSeed] = usePersist<number | null>('matchSeed', null)
  const [resultSaved, setResultSaved] = usePersist('resultSaved', false)
  const [mode, setMode] = usePersist<Mode>('mode', 'xi')
  const [chaos, setChaos] = usePersist<ChaosSettings>('chaosSettings', DEFAULT_CHAOS_SETTINGS)
  const [auctionKind, setAuctionKind] = usePersist<AuctionKind>('auctionKind', 'classic')
  // where the current game was left when someone went to the home page; null = no game in progress
  const [resume, setResume] = usePersist<Screen | null>('resume', null)

  const n = names.length
  const taken = new Set(teams.flatMap((t) => t.picks.filter((p): p is Player => !!p).map((p) => p.id)))
  const current = fixtures.findIndex((f) => f.winner === undefined)

  const pickPlayer = (p: Player) => {
    const ti = drafterAt(pickNo, order)
    const slot = roundOf(pickNo, n)
    const next = teams.map((t, i) => (i === ti ? { ...t, picks: t.picks.map((x, j) => (j === slot ? p : x)) } : t))
    const done = pickNo + 1 === n * 11
    if (done) finishDraft(next, new Set([...taken, p.id]))
    else {
      setTeams(next)
      setScreen('handover')
    }
    setPickNo(pickNo + 1)
  }

  // every mode ends its draft here: bench from the leftover pool, fixtures, then Done Choosing
  const finishDraft = (final: Team[], gone: Set<number>) => {
    store.clear('sot:'); store.clear('chaos:'); store.clear('auction:')
    const rng = makeRng(Date.now())
    const used = new Set([...gone, ...final.flatMap((t) => t.picks.map((p) => p?.id))])
    setTeams(fillBench(final, PLAYERS.filter((x) => !used.has(x.id)), rng))
    setFixtures(makeFixtures(n, rng))
    setScreen('done')
  }

  const setTactics = (ti: number, t: Tactics) => (online && ti !== seat.mySeat) ? undefined : setTeams(teams.map((x, i) => (i === ti ? { ...x, tactics: t } : x)))

  const match: MatchResult | null = useMemo(() => {
    const f = fixtures[current]
    return matchSeed !== null && f ? simulateMatch(teams[f.a], teams[f.b], matchSeed) : null
  }, [matchSeed, current, fixtures, teams])
  const kickOff = () => {
    setMatchSeed(Date.now())
    setScreen('match')
  }
  // signed in: skip the offline name screen
  useEffect(() => { if (account && screen === 'login') setScreen('modes') }, [account, screen, setScreen])
  // online: the host records the champion once, for the friends leaderboard
  const champ = champion(n, fixtures)
  useEffect(() => {
    if (champ !== null && onRecordResult && !resultSaved) { setResultSaved(true); onRecordResult(champ) }
  }, [champ, onRecordResult, resultSaved, setResultSaved])
  const me = account?.username ?? profile?.name

  const finishMatch = () => {
    if (!match) return
    const f = fixtures[current]
    const updated = fixtures.map((x, i) =>
      i === current ? { ...x, score: match.score, pens: match.pens, winner: match.winner === 0 ? f.a : f.b } : x,
    )
    setFixtures(nextFixtures(n, updated))
    setMatchSeed(null)
    setScreen('tournament')
  }

  // throw the game away (new game or play again)
  const discard = (to: Screen) => {
    store.clear()
    setTeams([])
    setPickNo(0)
    setFixtures([])
    setMatchSeed(null)
    setResultSaved(false)
    setResume(null)
    setScreen(to)
  }
  // home keeps the game: the landing page offers to resume it
  const IN_GAME: Screen[] = ['spinner', 'formation', 'size', 'draft', 'handover', 'modedraft', 'done', 'tournament', 'tactics', 'match']
  const goHome = () => {
    if (online) return onLeaveOnline!(false) // leave the shared game for this device only; friends carry on
    if (IN_GAME.includes(screen)) setResume(screen === 'match' ? 'tactics' : screen)
    setScreen('modes')
  }
  const startMode = (m: Mode) => {
    if (resume && !confirm('Start a new game? The game in progress will be discarded.')) return
    discard('home')
    setMode(m)
  }

  // same players, same mode, same settings: straight back to the spinner for a new pick order
  const rematch = () => {
    const keep = { names, mode, chaos, auctionKind }
    discard('spinner')
    setNames(keep.names); setMode(keep.mode); setChaos(keep.chaos); setAuctionKind(keep.auctionKind)
  }
  const kicker = MODE_NAMES[mode]

  const views: Record<Screen, () => ReactNode> = {
    login: () => <Login onDone={(p) => { setProfile(p); setScreen('modes') }} onAccount={() => setScreen('modes')} />,
    modes: () => <Landing onPlay={startMode} resume={resume ? { mode, onResume: () => { setScreen(resume); setResume(null) } } : undefined} />,
    home: () =>
      mode === 'xi' ? <Home onStart={() => setScreen('setup')} />
      : mode === 'sot' ? <SotHero onStart={() => setScreen('setup')} />
      : mode === 'chaos' ? <ChaosHero onStart={() => setScreen('setup')} />
      : <AuctionHero onStart={() => setScreen('setup')} />,
    setup: () => <Setup me={me} onStart={(ns) => { setNames(ns); setScreen('spinner') }} onOnline={onPlayOnline && (() => onPlayOnline(mode))} />,
    spinner: () => <Spinner names={names} onDone={(o) => { setOrder(o); setScreen(mode === 'auction' ? 'size' : 'formation') }} />,
    size: () => !seat.isHost ? <HostOnly note="Waiting for the host to set up the auction">{null}</HostOnly> : <SizePick onDone={(size, kind) => { setAuctionKind(kind); setTeams(names.map((nm) => newTeam(nm, `${size}-a-side`, SMALL_SIDED[size]))); setScreen('modedraft') }} />,
    modedraft: () =>
      mode === 'sot' ? <StickOrTwist teams={teams} order={order} onDone={finishDraft} />
      : mode === 'chaos' ? <ChaosDraft teams={teams} order={order} settings={chaos} onDone={finishDraft} />
      : <Auction teams={teams} order={order} kind={auctionKind} onDone={finishDraft} />,
    formation: () => (
      <FormationPick
        names={names}
        order={order}
        onDone={(fs) => { setTeams(names.map((nm, i) => newTeam(nm, fs[i].label, fs[i].slots))); setScreen(mode === 'xi' ? 'draft' : 'modedraft') }}
        extra={mode === 'chaos' && seat.isHost && <ChaosSettingsPanel value={chaos} onChange={setChaos} />}
      />
    ),
    draft: () => (
      <Draft teams={teams} order={order} pickNo={pickNo} teamIndex={drafterAt(pickNo, order)} slot={roundOf(pickNo, n)} taken={taken} onPick={pickPlayer} />
    ),
    handover: () => {
      const prev = teams[drafterAt(pickNo - 1, order)]
      const prevSlot = roundOf(pickNo - 1, n)
      const last = prev.picks[prevSlot]!
      const lastPos = slotsOf(prev)[prevSlot].pos
      const next = teams[drafterAt(pickNo, order)]
      return (
        <Handover
          name={next.name}
          lastTeam={prev.name}
          lastPick={last}
          lastOvr={effectiveOvr(last, lastPos)}
          lastPos={lastPos}
          nextPos={slotsOf(next)[roundOf(pickNo, n)].pos}
          pickNo={pickNo}
          total={n * 11}
          onReady={() => setScreen('draft')}
        />
      )
    },
    done: () => <DraftDone teams={teams} onAllDone={() => setScreen('tournament')} />,
    tournament: () => (
      <Tournament
        teams={teams}
        fixtures={fixtures}
        kicker={kicker}
        onNext={() => setScreen('tactics')}
        onRematch={rematch}
        onReset={() => (online ? onLeaveOnline!(true) : discard('home'))}
        resetLabel={online ? 'Leave the game' : 'Pick another mode'}
      />
    ),
    tactics: () => current >= 0 && (
      <TacticsScreen
        teams={teams}
        sides={[fixtures[current].a, fixtures[current].b]}
        stage={fixtures[current].stage}
        onChange={setTactics}
        onKickOff={kickOff}
      />
    ),
    match: () => !match ? views.tactics() : <Match result={match} teams={[teams[fixtures[current].a], teams[fixtures[current].b]]} seats={[fixtures[current].a, fixtures[current].b]} kicker={`${kicker} · ${fixtures[current].stage}`} onFinish={finishMatch} />,
  }
  const steps: [string, Screen[]][] = [
    ['Setup', ['setup', 'spinner', 'formation', 'size']],
    ['Draft', ['draft', 'handover', 'modedraft', 'done']],
    ['Tactics', ['tactics']],
    ['Match', ['match']],
    ['Tournament', ['tournament']],
  ]

  // the hand-over between players slides sideways; everything else fades.
  // Kept 2D on purpose: a 3D context around the glass button's backdrop-filter stops Chromium painting the page.
  const slide = screen === 'draft' || screen === 'handover'

  return (
    <div className="shell">
      <header className="topbar">
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          {!online && BACK[screen] && (
            <button className="btn ghost sm" onClick={() => setScreen(BACK[screen]!)} aria-label="Back">
              <ArrowLeft weight="bold" /> Back
            </button>
          )}
          <button className="wordmark" onClick={() => screen !== 'login' && goHome()}>
            {APP_NAME.split(' ')[0]} <i>{APP_NAME.split(' ').slice(1).join(' ')}</i>
          </button>
          {!['login', 'modes'].includes(screen) && (
            <button className="btn ghost sm" onClick={goHome} title="Your game is saved. Resume it from the home page.">
              <House weight="bold" /> Home
            </button>
          )}
        </div>
        {me && ['modes', 'home'].includes(screen) && (
          <div className="me">
            {onFriends && (
              <button className="btn ghost sm" onClick={onFriends}>
                <UsersThree weight="bold" /> Friends{invites > 0 && <span className="badge num">{invites}</span>}
              </button>
            )}
            <span className="avatar" aria-hidden>{me[0]?.toUpperCase()}</span>
            <span>Hello, <b>{account ? `@${me}` : me}</b></span>
            <button className="btn ghost sm" onClick={() => { saveProfile(null); setProfile(null); onSignOut?.(); discard('login') }} aria-label="Log out"><SignOut weight="bold" /></button>
          </div>
        )}
        {online && <span className="online-tag"><WifiHigh weight="bold" /> Online</span>}
        {!['login', 'modes', 'home'].includes(screen) && (
          <nav className="crumbs" aria-label="Progress">
            {steps.map(([label, ss], i) => (
              <span key={label} className={ss.includes(screen) ? 'on' : ''}>{i > 0 && '/ '}{label}</span>
            ))}
          </nav>
        )}
      </header>
      <AnimatePresence mode="wait">
        <motion.main
          key={screen === 'draft' || screen === 'handover' ? `${screen}-${pickNo}` : screen}
          initial={slide ? { opacity: 0, x: '55%' } : { opacity: 0, y: 24, filter: 'blur(6px)' }}
          animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
          exit={slide ? { opacity: 0, x: '-55%' } : { opacity: 0, y: -16, filter: 'blur(6px)' }}
          transition={{ duration: slide ? 0.5 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {views[screen]()}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
