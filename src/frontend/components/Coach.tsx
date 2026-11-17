import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Compass, X } from '@phosphor-icons/react'
import Kicko, { type Pose } from './Kicko'
import { getPrefs } from '../prefs'
import { consent, onConsent } from '../../backend/consent'

// Kicko's tips: a short card for every screen, shown the first time you land there and any time you
// press "?" in the top bar. Seen screens are remembered on this device only.
type Tip = { title: string; pose: Pose; points: string[] }
export const TIPS: Record<string, Tip> = {
  modes: { title: 'Pick a way to play', pose: 'point', points: [
    'Swipe, or use the arrows, to flip through the five modes. Press Play on the one you like.',
    'The Daily Draft is one puzzle a day, the same for everyone. Keep your streak going.',
    'The menu at the top right opens Leagues, Friends, Settings and this help.',
  ] },
  home: { title: 'How this mode works', pose: 'think', points: [
    'This page explains the rules. Have a read, then press the big button to set up players.',
    'Your game saves as you go. Leave any time and resume it from the home page.',
  ] },
  setup: { title: "Who's playing?", pose: 'point', points: [
    'Add a name for each player, up to 8. On one device you pass it round between picks.',
    'Playing alone? In All-Time XI you can add the computer as an opponent.',
    'Everyone on their own phone? Choose Play online (you need an account).',
  ] },
  spinner: { title: 'Who picks first?', pose: 'whistle', points: [
    'Spin to set the pick order.',
    'The order snakes: whoever picks last in one round picks first in the next, so it stays fair.',
  ] },
  formation: { title: 'Choose a formation', pose: 'think', points: [
    'Your formation decides which positions you draft.',
    'Players score most in their natural position. Out of position, their rating drops.',
  ] },
  size: { title: 'Set up the auction', pose: 'think', points: [
    'Pick how many a side and the auction style. Smaller teams make every bid matter more.',
  ] },
  draft: { title: 'Make your pick', pose: 'point', points: [
    'The glowing slot is the position you are filling. Search or filter, then tap a player.',
    'Lines between players light up green when they share a club, country, league or era. Links add chemistry.',
    'Picks are final, so think about the positions you still need.',
  ] },
  handover: { title: 'Pass the device', pose: 'hide', points: [
    'Hand it to the next player. Their screen stays hidden until they press Ready, so nobody peeks.',
  ] },
  'modedraft-sot': { title: 'Stick or twist', pose: 'card', points: [
    "You're dealt a player. Stick to keep him, or twist for a new one.",
    'You have 6 twists for the whole draft, so save them for the positions that matter.',
    'Each decision has a timer. When it runs out, you stick.',
  ] },
  'modedraft-chaos': { title: 'Chaos Draft', pose: 'card', points: [
    'A normal draft, except chaos cards keep changing the rules: who you can pick, swaps, boosts.',
    'Read each card as it lands. It might help you or ruin someone else.',
  ] },
  'modedraft-auction': { title: 'Auction', pose: 'whistle', points: [
    'Everyone has the same budget. Bid on each player; the highest bid wins him.',
    "Don't blow it all early. Keep money back for the positions you still need to fill.",
  ] },
  'modedraft-winners': { title: 'Team of Winners', pose: 'cheer', points: [
    'Spin the wheel to land on a trophy-winning squad, then take one of its players for your slot.',
    'Build an XI out of champions, then take it through a career.',
  ] },
  done: { title: 'Teams are set', pose: 'cheer', points: [
    'Check every XI and its rating. Bench players were filled in for you.',
    'When everyone is happy, carry on to the matches.',
  ] },
  tournament: { title: 'The tournament', pose: 'whistle', points: [
    'Matches are played one at a time. Before each one, both sides set their tactics.',
    'Win the final to be champion. Then play again with the same players, or pick another mode.',
  ] },
  tactics: { title: 'Set your tactics', pose: 'think', points: [
    'Build-up and defence decide how you play. Width and line height fine-tune it.',
    "Tactics matter against the other side's shape: a high line can be caught out by a counter.",
  ] },
  match: { title: 'Matchday', pose: 'whistle', points: [
    'The match plays out live. Watch the events, or skip to full time.',
  ] },
  career: { title: 'Your career', pose: 'cheer', points: [
    'Three seasons with the squad you built. Win trophies to finish on top.',
  ] },
  daily: { title: 'The Daily Draft', pose: 'think', points: [
    'One puzzle, the same for everyone today. Pick 11, then play 3 matches for a score out of 9.',
    'Come back tomorrow to keep your streak alive.',
  ] },
  profile: { title: 'Your profile', pose: 'cheer', points: [
    'XP, level, achievements and your record in every mode.',
    'New colour themes unlock as you level up. Find them in Settings, then Colours.',
  ] },
  leagues: { title: 'Leagues', pose: 'cheer', points: [
    'Create a league and share its code, or join one with a code from a mate.',
    'A season lasts a year. Most wins takes the title and goes on the honours board.',
    'Press Play to start a league game. Everyone in the league gets an invite.',
  ] },
  friends: { title: 'Friends', pose: 'wave', points: [
    'Search for a username to send a friend request.',
    'Challenge a friend to any mode, or join a game with its code.',
  ] },
  lobby: { title: 'The lobby', pose: 'whistle', points: [
    'Share the code or invite friends. The host starts the game once everyone is in.',
  ] },
}

const KEY = 'fw-tips-seen'
const seen = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] } }
const markSeen = (k: string) => { try { localStorage.setItem(KEY, JSON.stringify([...new Set([...seen(), k])])) } catch { /* shown again next time */ } }
/** Forget which tips were seen, so they show again (part of replaying the onboarding). */
export const resetTips = () => { try { localStorage.removeItem(KEY) } catch { /* private mode */ } }
/** Open the tips for the current screen from anywhere (the "?" button, the account menu). */
export const openHelp = () => dispatchEvent(new Event('fw-help'))

type Props = { screen: string; paused?: boolean; onTour?: () => void }

/** One per screen tree. Shows itself on a first visit (unless tips are off) and on every "?". */
export default function Coach({ screen, paused, onTour }: Props) {
  const tip = TIPS[screen]
  const [open, setOpen] = useState(false)
  // the cookie question comes first: both sit at the bottom of the screen and would cover each other
  const [cookieAsk, setCookieAsk] = useState(() => consent() === null)
  useEffect(() => onConsent((c) => setCookieAsk(c === null)), [])

  useEffect(() => {
    setOpen(false)
    if (!tip || paused || cookieAsk || !getPrefs().tips || seen().includes(screen)) return
    const t = setTimeout(() => setOpen(true), 900) // let the screen land first
    return () => clearTimeout(t)
  }, [screen, paused, tip, cookieAsk])

  useEffect(() => {
    const show = () => setOpen(true)
    addEventListener('fw-help', show)
    return () => removeEventListener('fw-help', show)
  }, [])

  const close = () => { setOpen(false); markSeen(screen) }
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const t = tip ?? { title: 'Need a hand?', pose: 'wave' as Pose, points: ['Press "Show me around" for the full tour of the game.'] }
  return (
    <AnimatePresence>
      {open && !paused && (
        <motion.aside key={screen} className="coach" role="dialog" aria-labelledby="coach-title"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
          <div className="coach-kicko" aria-hidden><Kicko pose={t.pose} size={76} /></div>
          <div className="coach-copy">
            <span className="label">Kicko's tip</span>
            <h3 id="coach-title">{t.title}</h3>
            <ul>{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <div className="row coach-foot">
              <button className="btn primary sm" onClick={close} autoFocus>Got it</button>
              {onTour && <button className="btn ghost sm" onClick={() => { close(); onTour() }}><Compass weight="bold" /> Show me around</button>}
            </div>
          </div>
          <button className="coach-x" onClick={close} aria-label="Close tip"><X weight="bold" /></button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
