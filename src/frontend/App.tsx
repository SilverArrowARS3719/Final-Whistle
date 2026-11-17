import { lazy, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SMALL_SIDED } from '../game/data/formations'
import { AnimatePresence, motion } from 'motion/react'
import { PLAYERS, type Player } from '../game/data/players'
import { drafterAt, fillBench, newTeam, roundOf, slotsOf, type Team } from '../game/engine/draft'
import { record } from '../game/engine/progress'
import { track } from '../backend/track'
import { levelOf } from '../game/engine/progress'
import DailyChip from './components/DailyChip'
import AccountMenu, { HelpButton } from './components/AccountMenu'
import Coach from './components/Coach'
import { LogoMark } from './components/Logo'
import Onboarding, { onboarded, takeReplay } from './components/Onboarding'
import Welcome, { welcomed } from './components/Welcome'
import ProfileScreen, { useProgress } from './screens/Profile'
import Legal, { type LegalTab } from './screens/Legal'
import { effectiveOvr } from '../game/engine/position'
import { makeRng } from '../game/engine/rng'
import { simulateMatch, type MatchResult } from '../game/engine/sim'
import type { Tactics } from '../game/engine/tactics'
import { champion, makeFixtures, nextFixtures, type Fixture } from '../game/engine/tournament'
import Landing, { type Mode } from './screens/Landing'
import Login, { loadProfile, openLoginOn, saveProfile, type Profile } from './screens/Login'
import { SignIn, WifiHigh } from '@phosphor-icons/react'
import type { Account } from '../backend/auth'
import { HostOnly, useOnline } from './online'
import type { AuctionKind } from '../game/engine/auction'
import { DEFAULT_CHAOS_SETTINGS, type ChaosSettings } from '../game/engine/chaos'
import { DEFAULT_SHAPE } from '../game/engine/winners'
import { ArrowLeft, House } from '@phosphor-icons/react'
import { StoreContext, usePersist } from '../game/engine/persist'
import { PageSkeleton } from './components/Skeleton'

// Every screen past the hero loads on demand, so a first visit only downloads the hero. Once the hero is
// up and the browser is idle, the rest is fetched in the background, so moving on still feels instant.
const SCREENS = {
  home: () => import('./screens/Home'),
  heroes: () => import('./screens/ModeHeroes'),
  setup: () => import('./screens/Setup'),
  spinner: () => import('./screens/Spinner'),
  formation: () => import('./screens/FormationPick'),
  draft: () => import('./screens/Draft'),
  cpu: () => import('./components/CpuTurn'),
  handover: () => import('./screens/Handover'),
  done: () => import('./screens/DraftDone'),
  tactics: () => import('./screens/Tactics'),
  match: () => import('./screens/Match'),
  tournament: () => import('./screens/Tournament'),
  sot: () => import('./screens/StickOrTwist'),
  chaos: () => import('./screens/ChaosDraft'),
  chaosSettings: () => import('./components/ChaosSettings'),
  auction: () => import('./screens/Auction'),
  size: () => import('./screens/SizePick'),
  winners: () => import('./screens/WinnersDraft'),
  career: () => import('./screens/Career'),
  daily: () => import('./screens/Daily'),
  insights: () => import('./screens/Insights'),
}
const Home = lazy(SCREENS.home)
const SotHero = lazy(() => SCREENS.heroes().then((m) => ({ default: m.SotHero })))
const ChaosHero = lazy(() => SCREENS.heroes().then((m) => ({ default: m.ChaosHero })))
const AuctionHero = lazy(() => SCREENS.heroes().then((m) => ({ default: m.AuctionHero })))
const WinnersHero = lazy(() => SCREENS.heroes().then((m) => ({ default: m.WinnersHero })))
const Setup = lazy(SCREENS.setup)
const Spinner = lazy(SCREENS.spinner)
const FormationPick = lazy(SCREENS.formation)
const Draft = lazy(SCREENS.draft)
const CpuTurn = lazy(SCREENS.cpu)
const Handover = lazy(SCREENS.handover)
const DraftDone = lazy(SCREENS.done)
const TacticsScreen = lazy(SCREENS.tactics)
const Match = lazy(SCREENS.match)
const Tournament = lazy(SCREENS.tournament)
const StickOrTwist = lazy(SCREENS.sot)
const ChaosDraft = lazy(SCREENS.chaos)
const ChaosSettingsPanel = lazy(SCREENS.chaosSettings)
const Auction = lazy(SCREENS.auction)
const SizePick = lazy(SCREENS.size)
const WinnersDraft = lazy(SCREENS.winners)
const Career = lazy(SCREENS.career)
const Daily = lazy(SCREENS.daily)
const Insights = lazy(SCREENS.insights)
// fetch the rest once the first screen is up; Safari has no requestIdleCallback, so a timer stands in
const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 2500))
idle(() => Object.values(SCREENS).forEach((load) => load().catch(() => { /* offline: loads when opened */ })))
import { APP_NAME } from '../game/engine/config'

const MODE_NAMES: Record<Mode, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction', winners: 'Team of Winners' }

type Screen = 'legal' | 'login' | 'modes' | 'home' | 'setup' | 'spinner' | 'formation' | 'size' | 'draft' | 'handover' | 'modedraft' | 'done' | 'tournament' | 'tactics' | 'match' | 'career' | 'daily' | 'profile' | 'insights'

// Where Back goes from each pre-draft step. Once picks start, leaving needs the logo (with a confirm).
const BACK: Partial<Record<Screen, Screen>> = { home: 'modes', setup: 'home', spinner: 'setup', formation: 'spinner', size: 'spinner', daily: 'modes', profile: 'modes', insights: 'profile' }
const RECORDED = 'fw-recorded' // the last game this device counted towards XP, so a refresh can't count it twice

type Props = {
  account: Account | null
  invites: number // friend requests + game invites waiting
  onFriends?: () => void
  onLeagues?: () => void
  onPlayOnline?: (mode: Mode) => void
  onLeaveOnline?: (forGood: boolean) => void
  onRecordResult?: (winnerSeat: number) => void
  onSignOut?: () => void
}

export default function App({ account, invites, onFriends, onLeagues, onPlayOnline, onLeaveOnline, onRecordResult, onSignOut }: Props) {
  const online = !!onLeaveOnline
  const store = useContext(StoreContext)
  const seat = useOnline()
  const [profile, setProfile] = useState<Profile | null>(loadProfile)
  // a match replay isn't saved, so a refresh during one goes back to its tactics screen
  // the game always opens on the mode slideshow; logging in comes when you choose something to play
  const [screen, setScreen] = usePersist<Screen>('screen', 'modes')
  const [wanted, setWanted] = useState<Mode | 'daily' | null>(null) // what they tried to play before logging in
  const [names, setNames] = usePersist<string[]>('names', [])
  const [cpu, setCpu] = usePersist<boolean[]>('cpu', [])
  const [gameId, setGameId] = usePersist('gameId', () => Date.now())
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
      // hand the device over only between two humans; the computer and a lone human go straight on
      const humans = names.filter((_, i) => !cpu[i]).length
      setScreen(cpu[drafterAt(pickNo + 1, order)] || humans <= 1 ? 'draft' : 'handover')
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
  useEffect(() => { if (account && screen === 'login') afterLogin() }, [account, screen]) // eslint-disable-line react-hooks/exhaustive-deps
  // online: the host records the champion once, for the friends leaderboard
  const champ = champion(n, fixtures)
  useEffect(() => {
    if (champ !== null && onRecordResult && !resultSaved) { setResultSaved(true); onRecordResult(champ) }
  }, [champ, onRecordResult, resultSaved, setResultSaved])
  const me = account?.username ?? profile?.name
  const level = levelOf(useProgress().xp)
  const [touring, setTouring] = useState(false)
  // legal pages open from anywhere (cookie banner, login, settings) and Back returns to where you were
  const [legal, setLegal] = useState<{ tab: LegalTab; from: Screen } | null>(null)
  // a brand-new visitor sees the hero first; Kicko's questions open on their first Play (sign-up comes after).
  // "Replay the onboarding" opens them straight away.
  const [welcoming, setWelcoming] = useState(takeReplay)
  const [replacing, setReplacing] = useState<Mode | null>(null) // a new mode picked while a game is in progress
  const [afterTour, setAfterTour] = useState<Mode | null>(null) // a replayed welcome's pick, played once the tour ends
  useEffect(() => {
    const open = (e: Event) => { setWelcoming(false); setLegal({ tab: (e as CustomEvent<LegalTab>).detail, from: screen === 'legal' ? 'modes' : screen }); setScreen('legal') }
    addEventListener('fw-legal', open)
    return () => removeEventListener('fw-legal', open)
  }) // re-bound each render so it knows the current screen
  // first time someone is logged in and back on the slideshow: show the tour once
  useEffect(() => { if (me && screen === 'modes' && !onboarded() && !welcoming) setTouring(true) }, [me, screen, welcoming])

  // XP and stats for this device's player. Offline, "you" are the seat with your name, or the only human.
  const mine = online ? seat.mySeat : (() => {
    const named = names.findIndex((x) => !!me && x.toLowerCase() === me.toLowerCase())
    if (named >= 0) return named
    const humans = names.map((_, i) => i).filter((i) => !cpu[i])
    return humans.length === 1 ? humans[0] : -1
  })()
  const countGame = (winner: number, fullSet = false) => {
    const sig = `${gameId}`
    try { if (localStorage.getItem(RECORDED) === sig) return; localStorage.setItem(RECORDED, sig) } catch { /* counted once per render at worst */ }
    const hasCpu = cpu.some(Boolean)
    track('game_done', { mode, players: n, online, cpu: hasCpu, won: mine >= 0 ? winner === mine : null })
    record({ kind: 'game', mode, players: n, won: mine >= 0 ? winner === mine : null, online, cpu: hasCpu, fullSet: fullSet && winner === mine })
  }
  useEffect(() => { if (champ !== null) countGame(champ) }, [champ]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { track('screen', { screen }) }, [screen])

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
    setGameId(Date.now())
    setTeams([])
    setPickNo(0)
    setFixtures([])
    setMatchSeed(null)
    setResultSaved(false)
    setResume(null)
    setScreen(to)
  }
  // home keeps the game: the landing page offers to resume it
  const IN_GAME: Screen[] = ['spinner', 'formation', 'size', 'draft', 'handover', 'modedraft', 'done', 'tournament', 'tactics', 'match', 'career']
  const goHome = () => {
    if (online) return onLeaveOnline!(false) // leave the shared game for this device only; friends carry on
    if (IN_GAME.includes(screen)) setResume(screen === 'match' ? 'tactics' : screen)
    setScreen('modes')
  }
  const afterLogin = () => {
    const w = wanted
    setWanted(null)
    if (w === 'daily') setScreen('daily')
    else if (w) startMode(w, true)
    else setScreen('modes')
  }
  // sure: they already said yes to dropping the game in progress (asked in the page, since browser pop-ups can be blocked)
  const startMode = (m: Mode, loggedIn = false, sure = false) => {
    if (!loggedIn && !account && !loadProfile()) {
      if (!welcomed()) { setWelcoming(true); return } // first Play: Kicko's questions, then sign-up
      setWanted(m); setScreen('login'); return
    }
    if (resume && !sure) { setReplacing(m); return }
    discard('home')
    setMode(m)
    track('mode_start', { mode: m })
  }

  // same players, same mode, same settings: straight back to the spinner for a new pick order
  const rematch = () => {
    const keep = { names, cpu, mode, chaos, auctionKind }
    discard('spinner')
    setNames(keep.names); setCpu(keep.cpu); setMode(keep.mode); setChaos(keep.chaos); setAuctionKind(keep.auctionKind)
    record({ kind: 'rematch' })
    track('rematch', { mode: keep.mode })
  }
  const kicker = MODE_NAMES[mode]

  const views: Record<Screen, () => ReactNode> = {
    login: () => <Login onDone={(p) => { setProfile(p); afterLogin() }} onAccount={afterLogin} onBack={() => { setWanted(null); setScreen('modes') }} />,
    modes: () => <Landing onPlay={(m) => startMode(m)} onDaily={() => (me ? setScreen('daily') : (setWanted('daily'), setScreen('login')))} resume={resume ? { mode, onResume: () => { setScreen(resume); setResume(null) } } : undefined} />,
    daily: () => <Daily account={account} />,
    profile: () => <ProfileScreen name={me ?? 'Manager'} onInsights={() => setScreen('insights')} signedIn={!!account} onDeleted={() => location.reload()} />,
    insights: () => <Insights />,
    legal: () => <Legal initial={legal?.tab} onBack={() => { const back = legal?.from ?? 'modes'; setLegal(null); setScreen(back) }} />,
    home: () =>
      mode === 'xi' ? <Home onStart={() => setScreen('setup')} />
      : mode === 'sot' ? <SotHero onStart={() => setScreen('setup')} />
      : mode === 'chaos' ? <ChaosHero onStart={() => setScreen('setup')} />
      : mode === 'winners' ? <WinnersHero onStart={() => setScreen('setup')} />
      : <AuctionHero onStart={() => setScreen('setup')} />,
    setup: () => <Setup me={me} cpuAllowed={mode === 'xi' && !online} onStart={(ns, c) => { setNames(ns); setCpu(c); setScreen('spinner') }} onOnline={onPlayOnline && (() => onPlayOnline(mode))} />,
    spinner: () => <Spinner names={names} onDone={(o) => { setOrder(o); setScreen(mode === 'auction' ? 'size' : 'formation') }} />,
    size: () => !seat.isHost ? <HostOnly note="Waiting for the host to set up the auction">{null}</HostOnly> : <SizePick onDone={(size, kind) => { setAuctionKind(kind); setTeams(names.map((nm) => newTeam(nm, `${size}-a-side`, SMALL_SIDED[size]))); setScreen('modedraft') }} />,
    modedraft: () =>
      mode === 'sot' ? <StickOrTwist teams={teams} order={order} onDone={finishDraft} />
      : mode === 'chaos' ? <ChaosDraft teams={teams} order={order} settings={chaos} onDone={finishDraft} />
      : mode === 'winners' ? <WinnersDraft teams={teams} order={order} onDone={(final) => { store.clear('winners:'); setTeams(final); setScreen('done') }} />
      : <Auction teams={teams} order={order} kind={auctionKind} onDone={finishDraft} />,
    formation: () => (
      <FormationPick
        names={names}
        order={order}
        onDone={(fs) => { setTeams(names.map((nm, i) => newTeam(fs[i].club ?? nm, fs[i].label, fs[i].slots))); setScreen(mode === 'xi' ? 'draft' : 'modedraft') }}
        clubs={mode === 'winners'}
        initial={mode === 'winners' ? DEFAULT_SHAPE : undefined}
        extra={mode === 'chaos' && seat.isHost && <ChaosSettingsPanel value={chaos} onChange={setChaos} />}
      />
    ),
    draft: () => cpu[drafterAt(pickNo, order)] ? (
      <CpuTurn
        key={pickNo}
        team={teams[drafterAt(pickNo, order)]}
        slot={roundOf(pickNo, n)}
        available={PLAYERS.filter((p) => !taken.has(p.id))}
        onPick={pickPlayer}
      />
    ) : (
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
    done: () => <DraftDone teams={teams} cpu={cpu} onAllDone={() => setScreen(mode === 'winners' ? 'career' : 'tournament')} next={mode === 'winners' ? 'Start the career' : undefined} />,
    career: () => (
      <Career
        teams={teams}
        kicker={kicker}
        onChampion={(seat, how) => { countGame(seat, how === 'set'); if (onRecordResult && !resultSaved) { setResultSaved(true); onRecordResult(seat) } }}
        onRematch={rematch}
        onReset={() => (online ? onLeaveOnline!(true) : discard('home'))}
        resetLabel={online ? 'Leave the game' : 'Pick another mode'}
      />
    ),
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
    ['Tournament', ['tournament', 'career']],
  ]

  // the hand-over between players slides sideways; everything else fades.
  // Kept 2D on purpose: a 3D context around the glass button's backdrop-filter stops Chromium painting the page.
  const slide = screen === 'draft' || screen === 'handover'

  return (
    <div className={`shell ${screen === 'modes' ? 'is-hero' : ''}`}>
      {screen !== 'login' && <header className="topbar" inert={welcoming || touring || undefined}>
        <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
          {!online && BACK[screen] && (
            <button className="btn ghost sm tb-btn" onClick={() => setScreen(BACK[screen]!)} aria-label="Back">
              <ArrowLeft weight="bold" /> <span className="tb-label">Back</span>
            </button>
          )}
          <button className="wordmark" onClick={goHome} aria-label={`${APP_NAME}, home`}>
            <LogoMark />{APP_NAME.split(' ')[0]} <i>{APP_NAME.split(' ').slice(1).join(' ')}</i>
          </button>
          {!['login', 'modes'].includes(screen) && (
            <button className="btn ghost sm tb-btn tb-home" onClick={goHome} aria-label="Home" title="Your game is saved. Resume it from the home page.">
              <House weight="bold" /> <span className="tb-label">Home</span>
            </button>
          )}
        </div>
        <div className="topbar-mid">
          {online && <span className="online-tag"><WifiHigh weight="bold" /> Online</span>}
          {!['login', 'modes', 'home', 'daily', 'profile', 'insights', 'legal'].includes(screen) && (
            <nav className="crumbs" aria-label="Progress">
              {steps.map(([label, ss], i) => (
                <span key={label} className={ss.includes(screen) ? 'on' : ''}>{i > 0 && '/ '}{label}</span>
              ))}
            </nav>
          )}
        </div>
        <div className={`me ${me ? '' : 'guest'}`}>
          {me && ['modes', 'home'].includes(screen) && <DailyChip onOpen={() => setScreen('daily')} />}
          <HelpButton />
          <AccountMenu
            me={me ?? null}
            handle={!!account}
            level={level}
            invites={invites}
            compact={IN_GAME.includes(screen)}
            onProfile={() => setScreen('profile')}
            onLeagues={online ? undefined : onLeagues}
            onFriends={online ? undefined : onFriends}
            onTour={() => setTouring(true)}
            // not mid online game: discard() would clear the shared game, not just this device's copy
            onSignOut={online ? undefined : () => { saveProfile(null); setProfile(null); onSignOut?.(); discard('modes') }}
          />
          {!me && screen === 'modes' && <>
            <button className="btn sm" onClick={() => { openLoginOn('login'); setScreen('login') }}><SignIn weight="bold" /> Log in</button>
            <button className="btn primary sm tb-create" onClick={() => { openLoginOn('create'); setScreen('login') }}>Create account</button>
          </>}
        </div>
      </header>}
      <AnimatePresence mode="wait">
        <motion.main
          inert={welcoming || touring || undefined}
          key={screen === 'draft' || screen === 'handover' ? `${screen}-${pickNo}` : screen}
          // whole `transform` strings and opacity run on the GPU (x/y would tick on the main thread while the
          // new screen mounts); the old page leaves fast so the next one isn't kept waiting.
          // Ends on 'none' (transitionEnd): even translateY(0) would trap position: fixed children.
          initial={{ opacity: 0, transform: slide ? 'translateX(40%)' : 'translateY(14px)' }}
          animate={{ opacity: 1, transform: slide ? 'translateX(0%)' : 'translateY(0px)', transitionEnd: { transform: 'none' } }}
          exit={{ opacity: 0, transform: slide ? 'translateX(-30%)' : 'translateY(-8px)', transition: { duration: 0.16, ease: 'easeIn' } }}
          transition={{ duration: slide ? 0.4 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<PageSkeleton />}>{views[screen]()}</Suspense>
        </motion.main>
      </AnimatePresence>
      <AnimatePresence>{welcoming && <Welcome
        loggedIn={!!me}
        onClose={() => setWelcoming(false)}
        onPlay={(m) => {
          setWelcoming(false)
          if (me) { setAfterTour(m); setTouring(true); return } // already logged in (a replay): straight into the tour
          setWanted(m); openLoginOn('create'); setScreen('login')
        }}
        onHaveAccount={() => { setWelcoming(false); if (me) return setTouring(true); openLoginOn('login'); setScreen('login') }} />}</AnimatePresence>
      <Coach screen={screen === 'modedraft' ? `modedraft-${mode}` : screen} paused={welcoming || touring || screen === 'login'} onTour={() => setTouring(true)} />
      <AnimatePresence>{replacing && (
        <motion.div className="del-scrim" onClick={() => setReplacing(null)} onKeyDown={(e) => e.key === 'Escape' && setReplacing(null)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="del" role="alertdialog" aria-modal="true" aria-labelledby="new-game-q" onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <h3 id="new-game-q">Start a new game?</h3>
            <p className="small dim">The game in progress will be discarded.</p>
            <div className="row del-foot">
              <button className="btn ghost" onClick={() => setReplacing(null)} autoFocus>Keep it</button>
              <button className="btn primary" onClick={() => { const m = replacing; setReplacing(null); startMode(m, true, true) }}>Start new game</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
      <AnimatePresence>{touring && <Onboarding name={me} onDone={() => { setTouring(false); if (afterTour) { const m = afterTour; setAfterTour(null); startMode(m) } }} />}</AnimatePresence>
    </div>
  )
}
