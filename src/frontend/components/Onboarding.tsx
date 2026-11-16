import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, CalendarCheck, Crown, Fire, Medal, Palette, UsersThree } from '@phosphor-icons/react'
import { APP_NAME } from '../../game/engine/config'
import { sfx } from '../../game/engine/sfx'
import Kicko, { type Pose } from './Kicko'

const KEY = 'fw-onboarded'
export const onboarded = () => { try { return localStorage.getItem(KEY) === '1' } catch { return true } }
export const resetOnboarding = () => { try { localStorage.removeItem(KEY) } catch { /* private mode */ } }

const ease = [0.16, 1, 0.3, 1] as const
const pop = (delay: number) => ({ initial: { opacity: 0, y: 24, scale: 0.85 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: 'spring' as const, stiffness: 260, damping: 18, delay } })

const MODES = [
  { name: 'All-Time XI', img: '/img/xi.jpg' },
  { name: 'Stick or Twist', img: '/img/sot.jpg' },
  { name: 'Chaos Draft', img: '/img/chaos.jpg' },
  { name: 'Auction', img: '/img/auction.jpg' },
  { name: 'Team of Winners', img: '/img/winners.jpg' },
]

// Each step: what Kicko says, his pose, the glow colour of the stage and the little scene beside him.
type Step = { pose: Pose; glow: string; title: string; say: ReactNode; scene: ReactNode }
const STEPS = (name?: string): Step[] => [
  {
    pose: 'card', glow: '210 239 91',
    title: name ? `Hi ${name}, I'm Kicko.` : "Hi, I'm Kicko.",
    say: <>Welcome to <b>{APP_NAME}</b>. You build a team, then the match decides who was right. Play on one device with friends, against the computer, or online.</>,
    scene: (
      <div className="scene-pitch">
        <span className="pitch-line" /><span className="pitch-circle" />
        {[[22, 30], [50, 22], [78, 30], [34, 62], [66, 62], [50, 84]].map(([x, y], k) => (
          <motion.i key={k} className="dot" style={{ left: `${x}%`, top: `${y}%` }} {...pop(0.2 + k * 0.07)} />
        ))}
      </div>
    ),
  },
  {
    pose: 'point', glow: '108 195 255',
    title: 'Five ways to play.',
    say: <>Swipe through them on the home page. Draft legends, gamble on deals, survive chaos cards, win an auction or spin for a trophy.</>,
    scene: (
      <div className="scene-fan">
        {MODES.map((m, k) => (
          <motion.figure key={m.name} className="fan-card" style={{ ['--r' as string]: `${(k - 2) * 9}deg`, ['--x' as string]: `${(k - 2) * 34}px`, zIndex: 5 - Math.abs(k - 2) }}
            initial={{ opacity: 0, y: 60, rotate: 0 }} animate={{ opacity: 1, y: Math.abs(k - 2) * 8, rotate: (k - 2) * 9 }} transition={{ type: 'spring', stiffness: 180, damping: 16, delay: 0.1 + k * 0.06 }}>
            <img src={m.img} alt="" />
            <figcaption>{m.name}</figcaption>
          </motion.figure>
        ))}
      </div>
    ),
  },
  {
    pose: 'think', glow: '243 199 75',
    title: 'One puzzle a day.',
    say: <>The <b>Daily Draft</b> is the same for everyone. Eleven picks, three matches, a score out of 9. Come back every day to keep your streak alive.</>,
    scene: (
      <div className="scene-daily">
        <motion.div className="cal-big" {...pop(0.15)}><CalendarCheck weight="fill" /><b className="num">9/9</b></motion.div>
        <div className="streak-row">
          {[1, 1, 1, 1, 1, 0, 0].map((on, k) => <motion.i key={k} className={on ? 'on' : ''} {...pop(0.3 + k * 0.06)} />)}
        </div>
        <motion.span className="streak-chip" {...pop(0.8)}><Fire weight="fill" /> 5-day streak</motion.span>
      </div>
    ),
  },
  {
    pose: 'cheer', glow: '255 170 80',
    title: 'Leagues with your mates.',
    say: <>A <b>league</b> is your group. Send the code and anyone can join. Each season lasts a year and <b>most wins</b> takes the title. Add <b>friends</b> to challenge them any time.</>,
    scene: (
      <div className="scene-league">
        <motion.span className="code-chip num" {...pop(0.25)}><UsersThree weight="fill" /> CODE K7Q2XA</motion.span>
        {[['You', 12], ['Ravi', 9], ['Adnan', 7]].map(([n, w], k) => (
          <motion.div key={n} className={`league-row ${k === 0 ? 'lead' : ''}`} {...pop(0.35 + k * 0.1)}>
            <span className="num">{k + 1}</span><b>{n}</b><span className="num">{w} W</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    pose: 'whistle', glow: '210 239 91',
    title: 'Level up as you play.',
    say: <>Every game, win and Daily earns <b>XP</b>. Unlock achievements and new colour themes in Settings. Tap your name at the top to see your profile. Now, kick off!</>,
    scene: (
      <div className="scene-level">
        <motion.span className="level-badge num" {...pop(0.15)}>LV 4</motion.span>
        <div className="xp"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 0.7 }} transition={{ duration: 1.2, ease, delay: 0.3 }} /></div>
        <div className="badges">
          {[<Medal key="m" weight="fill" />, <Crown key="c" weight="fill" />, <Palette key="p" weight="fill" />].map((ic, k) => <motion.span key={k} {...pop(0.6 + k * 0.12)}>{ic}</motion.span>)}
        </div>
      </div>
    ),
  },
]

/** First-time tour after logging in, guided by Kicko. Five short steps; skip any time. Replay it from your profile. */
export default function Onboarding({ name, onDone }: { name?: string; onDone: () => void }) {
  const reduce = useReducedMotion()
  const steps = STEPS(name)
  const [[i, dir], set] = useState<[number, number]>([0, 1])
  const last = i === steps.length - 1
  const finish = () => { try { localStorage.setItem(KEY, '1') } catch { /* private mode */ } if (last) sfx.whistle(); onDone() }
  const go = (to: number) => { sfx.flip(); set([to, to > i ? 1 : -1]) }

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') (last ? finish() : go(i + 1))
      if (e.key === 'ArrowLeft' && i > 0) go(i - 1)
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }) // re-bound each render so it sees the current step

  const s = steps[i]
  const slide = reduce ? {} : { initial: { opacity: 0, x: dir * 50, filter: 'blur(8px)' }, animate: { opacity: 1, x: 0, filter: 'blur(0px)' }, exit: { opacity: 0, x: -dir * 50, filter: 'blur(8px)' } }
  return (
    <motion.div className="tour-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" style={{ ['--glow' as string]: s.glow }}
        initial={reduce ? false : { y: 80, scale: 0.9, rotateX: 18, filter: 'blur(12px)' }} animate={{ y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)' }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}>
        <button className="tour-skip" onClick={finish}>Skip</button>

        <div className="tour-stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} className="stage-scene" {...slide} transition={{ duration: 0.35, ease }}>{s.scene}</motion.div>
          </AnimatePresence>
          <motion.div className="stage-pip" key={`pip-${s.pose}`} initial={reduce ? false : { y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
            <Kicko pose={s.pose} size={130} />
          </motion.div>
        </div>

        <div className="tour-copy">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={i} className="stack" style={{ gap: 12 }} {...slide} transition={{ duration: 0.3, ease }}>
              <span className="tour-step num">{i + 1} / {steps.length}</span>
              <h2 id="tour-title">{s.title}</h2>
              <p className="tour-say">{s.say}</p>
            </motion.div>
          </AnimatePresence>
          <div className="tour-foot">
            <div className="tour-dots" aria-label={`Step ${i + 1} of ${steps.length}`}>
              {steps.map((_, k) => <button key={k} className={k === i ? 'on' : k < i ? 'done' : ''} onClick={() => go(k)} aria-label={`Step ${k + 1}`} />)}
            </div>
            <div className="row">
              {i > 0 && <button className="btn ghost" onClick={() => go(i - 1)} aria-label="Back"><ArrowLeft weight="bold" /></button>}
              <button className="btn primary lg" onClick={last ? finish : () => go(i + 1)} autoFocus>
                {last ? <>Kick off <ArrowRight weight="bold" /></> : <>Next <ArrowRight weight="bold" /></>}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
