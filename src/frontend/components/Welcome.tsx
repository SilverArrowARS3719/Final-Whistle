import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { ArrowLeft, Brain, CalendarCheck, Desktop, Fire, Lightning, Robot, Smiley, SoccerBall, Trophy, WifiHigh } from '@phosphor-icons/react'
import type { Mode } from '../screens/Landing'
import { sfx } from '../../game/engine/sfx'
import Kicko, { type Pose } from './Kicko'
import { usePrefs } from '../prefs'

// Duolingo-style first visit: the mascot asks a few one-tap questions, recommends where to start, and only
// then asks for an account. Answers stay on this device and only shape the suggestion and the daily goal.
const KEY = 'fw-welcome'
export type Answers = { how?: string; level?: string; goal?: number; streak?: number }
export const welcomed = () => { try { return localStorage.getItem(KEY) !== null } catch { return true } }
export function welcomeAnswers(): Answers { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
const save = (a: Answers) => { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* not remembered */ } }

type Option = { id: string; icon: ReactNode; label: string; hint?: string }
type Ask = { key: keyof Answers; say: string; pose: Pose; options: Option[] }

const ASKS: Ask[] = [
  {
    key: 'how', pose: 'point', say: 'How will you mostly play?',
    options: [
      { id: 'couch', icon: <Desktop weight="fill" />, label: 'With mates on one device', hint: 'Pass the phone round' },
      { id: 'online', icon: <WifiHigh weight="fill" />, label: 'Online with friends', hint: 'Everyone on their own phone' },
      { id: 'cpu', icon: <Robot weight="fill" />, label: 'On my own against the computer' },
      { id: 'unsure', icon: <Smiley weight="fill" />, label: 'Not sure yet' },
    ],
  },
  {
    key: 'level', pose: 'think', say: 'How well do you know your football?',
    options: [
      { id: 'casual', icon: <SoccerBall weight="fill" />, label: 'I know the big names' },
      { id: 'fan', icon: <Trophy weight="fill" />, label: 'I watch every weekend' },
      { id: 'nerd', icon: <Brain weight="fill" />, label: 'I could name a 1970s back four' },
    ],
  },
  {
    key: 'goal', pose: 'whistle', say: "What's your daily goal?",
    options: [
      { id: '1', icon: <CalendarCheck weight="fill" />, label: 'Casual', hint: 'The Daily Draft' },
      { id: '2', icon: <Lightning weight="fill" />, label: 'Regular', hint: 'Daily Draft + 1 game' },
      { id: '4', icon: <Fire weight="fill" />, label: 'Serious', hint: 'Daily Draft + 3 games' },
    ],
  },
  {
    key: 'streak', pose: 'cheer', say: 'Pick a streak to aim for. I\'ll cheer you on.',
    options: [
      { id: '3', icon: <Fire weight="fill" />, label: '3 days', hint: 'A good start' },
      { id: '7', icon: <Fire weight="fill" />, label: '7 days', hint: 'Most popular' },
      { id: '14', icon: <Fire weight="fill" />, label: '14 days', hint: 'Committed' },
      { id: '30', icon: <Fire weight="fill" />, label: '30 days', hint: 'Legend' },
    ],
  },
]

/** Where to start, from the answers: solo players get the computer, experts get the hardest draft. */
export function recommend(a: Answers): { mode: Mode; why: string } {
  if (a.how === 'cpu') return { mode: 'xi', why: 'Draft your all-time XI and take on Robo Pep, our computer manager.' }
  if (a.level === 'nerd') return { mode: 'chaos', why: 'You know your stuff, so let\'s make it hard: a draft with chaos cards.' }
  if (a.level === 'casual') return { mode: 'sot', why: 'No research needed: you\'re dealt players and just stick or twist.' }
  return { mode: 'xi', why: 'The classic: draft the best XI of all time with your mates.' }
}
const MODE_NAME: Record<Mode, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction', winners: 'Team of Winners' }

const ease = [0.16, 1, 0.3, 1] as const // ease-out: fast in, gentle landing

type Props = { onPlay: (m: Mode) => void; onHaveAccount: () => void; loggedIn?: boolean; onClose?: () => void }

export default function Welcome({ onPlay, onHaveAccount, loggedIn = false, onClose }: Props) {
  const reduce = useReducedMotionConfig()
  const { effects } = usePrefs()
  const still = reduce || !effects
  const [step, setStep] = useState(0) // 0 = hello, 1..n = questions, n+1 = recommendation
  const [answers, setAnswers] = useState<Answers>({})
  const [picked, setPicked] = useState<string | null>(null)
  const n = ASKS.length
  const ask = ASKS[step - 1]
  const rec = recommend(answers)

  useEffect(() => { setPicked(ask ? String(answers[ask.key] ?? '') || null : null) }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    sfx.pick()
    if (ask && picked) {
      const a = { ...answers, [ask.key]: ask.key === 'goal' || ask.key === 'streak' ? Number(picked) : picked }
      setAnswers(a)
    }
    setStep(step + 1)
  }
  const finish = () => { save(answers); sfx.whistle(); onPlay(rec.mode) }
  const haveAccount = () => { save(answers); onHaveAccount() }

  const photo = step > n ? `/img/${rec.mode}.webp` : ['/img/xi.webp', '/img/winners.webp', '/img/sot.webp', '/img/chaos.webp', '/img/winners.webp'][step]
  const pose: Pose = step === 0 ? 'wave' : ask ? ask.pose : 'card'
  const say = step === 0 ? "Hi, I'm Kicko." : ask ? ask.say : 'Your game is ready.'
  const sub = step === 0 ? "I'm the referee here. Four quick questions and I'll find the right game for you." : null

  return (
    <motion.div className="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
      {/* the same floodlit photo world as the hero: each question gets its own stadium */}
      <div className="welcome-bg" aria-hidden>
        <AnimatePresence initial={false}>
          <motion.img key={photo} src={photo} alt="" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1.02 }} exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.8 }, scale: { duration: still ? 0 : 12, ease: 'linear' } }} />
        </AnimatePresence>
        <div className="backdrop-shade" />
      </div>
      <div className="welcome-inner">
        {/* progress, Duolingo style: a fat bar that fills with a little shine */}
        <div className="welcome-top">
          {step > 0 ? <button className="welcome-back" onClick={() => setStep(step - 1)} aria-label="Back"><ArrowLeft weight="bold" /></button>
            : onClose ? <button className="welcome-back" onClick={onClose} aria-label="Back to the modes"><ArrowLeft weight="bold" /></button> : <span />}
          <div className="welcome-bar" role="progressbar" aria-valuemin={0} aria-valuemax={n + 1} aria-valuenow={step} aria-label="Progress">
            <motion.i initial={false} animate={{ width: `${Math.max(4, (step / (n + 1)) * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
          </div>
        </div>

        {/* Kicko and his speech bubble */}
        <div className="welcome-talk">
          <motion.div key={`k-${pose}`} initial={reduce ? false : { scale: 0.8, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 15 }}>
            <Kicko pose={pose} size={step === 0 || step > n ? 170 : 120} />
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.p key={step} className="bubble" initial={reduce ? false : { opacity: 0, scale: 0.85, x: -12 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.35, ease }}>
              {say}
              {sub && <span className="bubble-sub">{sub}</span>}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* answers drop in one after another */}
        <div className="welcome-body">
          <AnimatePresence mode="wait">
            {ask && (
              <motion.div key={step} className="choices" role="radiogroup" aria-label={ask.say} exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}>
                {ask.options.map((o, k) => (
                  <motion.button key={o.id} role="radio" aria-checked={picked === o.id} className={`choice ${picked === o.id ? 'on' : ''}`}
                    onClick={() => { setPicked(o.id); sfx.tick() }}
                    initial={reduce ? false : { opacity: 0, y: -26, rotateX: -35 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.12 + k * 0.07 }}>
                    <span className="choice-ico">{o.icon}</span>
                    <span className="choice-copy"><b>{o.label}</b>{o.hint && <span>{o.hint}</span>}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
            {step > n && (
              <motion.div key="rec" className="rec-card" initial={reduce ? false : { opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, ease, delay: 0.15 }}>
                <img src={`/img/${rec.mode}.webp`} alt="" />
                <div>
                  <span className="label">Kicko recommends</span>
                  <b>{MODE_NAME[rec.mode]}</b>
                  <span className="rec-why">{rec.why}</span>
                  {answers.goal && <span className="small">Daily goal: {answers.goal === 1 ? 'the Daily Draft' : `Daily Draft + ${answers.goal - 1} game${answers.goal > 2 ? 's' : ''}`} · aiming for a {answers.streak ?? 7}-day streak</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="welcome-foot">
          {step === 0 && <>
            <button className="btn primary lg welcome-cta" onClick={next} autoFocus>Get started</button>
            <button className="btn glass lg welcome-cta" onClick={haveAccount}>{loggedIn ? 'Skip to the tour' : 'I already have an account'}</button>
          </>}
          {ask && <button className="btn primary lg welcome-cta" disabled={!picked} onClick={next}>Continue</button>}
          {step > n && <>
            <button className="btn primary lg welcome-cta" onClick={finish}>Play {MODE_NAME[rec.mode]}</button>
            {!loggedIn && <span className="small welcome-note">Next, create a free account so your progress is saved.</span>}
          </>}
        </div>
      </div>
    </motion.div>
  )
}
