import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, CalendarCheck, CaretLeft, CaretRight, Fire, LockSimple } from '@phosphor-icons/react'
import { dailyFor, dayKey, loadDaily, streakOf } from '../../game/engine/daily'
import Atmosphere from '../components/Atmosphere'
import Ticker from '../components/Ticker'
import { useProgress } from './Profile'
import { createPortal } from 'react-dom'

export type Mode = 'xi' | 'sot' | 'chaos' | 'auction' | 'winners'
type Slide = { mode: Mode | null; n: number; title: string; line: string; img: string; glow: string }

const SLIDES: Slide[] = [
  { mode: 'xi', n: 1, title: 'All-Time XI', line: 'Draft your best XI of all time. If someone already took him, he is gone.', img: '/img/xi.jpg', glow: 'var(--accent-rgb)' },
  { mode: 'sot', n: 2, title: 'Stick or Twist', line: "You're dealt the players. Gamble for better ones, but don't bust the cap.", img: '/img/sot.jpg', glow: '243 199 75' },
  { mode: 'chaos', n: 3, title: 'Chaos Draft', line: 'A normal draft, until the cards start flipping.', img: '/img/chaos.jpg', glow: '108 195 255' },
  { mode: 'auction', n: 4, title: 'Auction', line: 'Open or blind bidding with a fixed budget. Build a 5 or 7-a-side team without going broke.', img: '/img/auction.jpg', glow: '231 199 104' },
  { mode: 'winners', n: 5, title: 'Team of Winners', line: 'Spin for a trophy, take a player from whoever holds it. Then try to win everything in three seasons.', img: '/img/winners.jpg', glow: '255 170 80' },
]
const AUTOPLAY_MS = 7000
const SLIDE = {
  enter: (d: number) => ({ x: `${d * 105}%`, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: `${-d * 105}%`, opacity: 0 }),
}
const FADE = {
  enter: (d: number) => ({ x: d * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: -d * 40, opacity: 0 }),
}
const ease = [0.16, 1, 0.3, 1] as const

type Resume = { mode: Mode; onResume: () => void }

export default function Landing({ onPlay, onDaily, resume }: { onPlay: (m: Mode) => void; onDaily?: () => void; resume?: Resume }) {
  const today = dayKey()
  const history = loadDaily()
  const todays = history[today]?.result
  const streak = streakOf(history, today)
  const progress = useProgress()
  const reduce = useReducedMotion()
  const [[i, dir], setSlide] = useState<[number, number]>([0, 1])
  // dir: +1 = new slide enters from the right (next / swipe left), -1 = from the left
  const go = (to: number, d = to >= i ? 1 : -1) => setSlide([(to + SLIDES.length) % SLIDES.length, d])
  const s = SLIDES[i]

  const [dragging, setDragging] = useState(false)
  // autoplay keeps running on hover, pauses while dragging; each change restarts the timer
  useEffect(() => {
    if (reduce || dragging) return
    const id = setTimeout(() => setSlide([(i + 1) % SLIDES.length, 1]), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [i, reduce, dragging])

  // preload every backdrop so slides never flash
  useEffect(() => SLIDES.forEach((x) => { new Image().src = x.img }), [])

  // the first card is the mode on the left; the next two follow
  const shown = [0, 1, 2].map((k) => (i + k) % SLIDES.length)

  // trackpad swipe (sideways scroll), mouse wheel and arrow keys switch modes; one step per gesture
  const gesture = useRef({ acc: 0, until: 0 })
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const fitsScreen = document.documentElement.scrollHeight <= innerHeight + 4
      if (!sideways && !fitsScreen) return // let tall pages scroll normally
      const d = sideways ? e.deltaX : e.deltaY
      const g = gesture.current
      const now = performance.now()
      if (now < g.until) { g.until = now + 180; return } // still the same flick: ignore its momentum
      g.acc += d
      if (Math.abs(g.acc) > 40) {
        const dir = Math.sign(g.acc) // read now: the updater below may run after acc is reset
        setSlide(([cur]) => [(cur + dir + SLIDES.length) % SLIDES.length, dir])
        g.acc = 0
        g.until = now + 450
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [role=dialog]')) return
      if (e.key === 'ArrowRight') setSlide(([cur]) => [(cur + 1) % SLIDES.length, 1])
      if (e.key === 'ArrowLeft') setSlide(([cur]) => [(cur - 1 + SLIDES.length) % SLIDES.length, -1])
    }
    addEventListener('wheel', onWheel, { passive: true })
    addEventListener('keydown', onKey)
    return () => { removeEventListener('wheel', onWheel); removeEventListener('keydown', onKey) }
  }, [])

  return (
    <>
      {/* every photo stays mounted; only the current one is visible, so photo and text can't disagree */}
      {createPortal(
        <div className="backdrop" aria-hidden>
          {SLIDES.map((x, k) => (
            <motion.img
              key={x.n}
              src={x.img}
              alt=""
              initial={false}
              animate={{ opacity: k === i ? 1 : 0, scale: k === i && !reduce ? 1.02 : 1.1 }}
              transition={{ opacity: { duration: 0.8, ease }, scale: { duration: k === i ? AUTOPLAY_MS / 1000 + 1.5 : 0.8, ease: 'linear' } }}
            />
          ))}
          <div className="backdrop-shade" />
          {/* each mode washes the stadium in its own colour */}
          <AnimatePresence initial={false}>
            <motion.div key={s.n} className="mode-glow" style={{ ['--glow' as string]: s.glow }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease }} />
          </AnimatePresence>
          <Atmosphere fixed={false} />
        </div>,
        document.body,
      )}

      <Ticker progress={progress} />
      <motion.section
        className="slider"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        dragSnapToOrigin
        onDragStart={() => setDragging(true)}
        onDragEnd={(_, info) => {
          setDragging(false)
          // the slide follows the finger; let go past the threshold to switch (left = next, right = previous)
          if (info.offset.x < -70 || info.velocity.x < -500) go(i + 1, 1)
          else if (info.offset.x > 70 || info.velocity.x > 500) go(i - 1, -1)
        }}
      >
        <nav className="rail" aria-label="Game modes">
          {SLIDES.map((x, k) => (
            <button key={x.n} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={x.title} aria-current={k === i}>
              {k === i && !reduce && <motion.span className="fill" key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }} />}
            </button>
          ))}
          <span className="rail-num num">0{i + 1}</span>
        </nav>

        <div className="slide-copy">
          {resume && (
            <motion.button className="resume" onClick={resume.onResume} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <span className="pulse" aria-hidden /> Game in progress: {SLIDES.find((x) => x.mode === resume.mode)?.title}
              <b>Resume <ArrowRight weight="bold" /></b>
            </motion.button>
          )}
          {onDaily && !todays && (
            <motion.button className="daily-pill" onClick={onDaily} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <CalendarCheck weight="fill" />
              <span>Today's puzzle · Daily Draft #{dailyFor(today).number}</span>
              <b>Play <ArrowRight weight="bold" /></b>
              {streak > 0 && <span className="streak"><Fire weight="fill" /> {streak}</span>}
            </motion.button>
          )}
          <div className="title-mask">
            <AnimatePresence initial={false} custom={dir}>
              <motion.h1 key={s.title} custom={dir} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={{ duration: 0.7, ease }}>
                {s.title}
              </motion.h1>
            </AnimatePresence>
          </div>
          {/* old and new copy share one grid cell (no "wait" mode), so text can never lag behind the photo */}
          <div className="copy-stack">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div key={s.n} custom={dir} variants={FADE} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease }} className="stack" style={{ gap: 24 }}>
              <p className="slide-line">{s.line}</p>
              <div>
                {s.mode ? (
                  <button className="btn primary lg" onClick={() => onPlay(s.mode!)}>Play {s.title} <ArrowRight weight="bold" /></button>
                ) : (
                  <button className="btn glass lg" disabled><LockSimple weight="bold" /> Locked</button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        <div className="slide-cards">
          <span className="up-next">Swipe to switch modes</span>
          {shown.map((k, pos) => {
            const x = SLIDES[k]
            return (
              <motion.button
                key={x.n}
                layout
                className={`slide-card ${pos === 0 ? 'now' : ''}`}
                onClick={() => (pos === 0 ? x.mode && onPlay(x.mode) : go(k, 1))}
                aria-label={pos === 0 ? `Play ${x.title}` : `Show ${x.title}`}
                transition={{ layout: { duration: 0.7, ease } }}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ y: -8 }}
              >
                <span className="slide-card-title">{x.title}</span>
                <img src={x.img} alt="" />
                <span className="slide-card-foot">{pos === 0 ? <b>Now showing · tap to play</b> : <>Mode {x.n}{!x.mode && ' · soon'}</>}</span>
              </motion.button>
            )
          })}
        </div>

        <div className="slide-nav">
          <button className="btn glass" onClick={() => go(i - 1, -1)} aria-label="Previous mode"><CaretLeft weight="bold" /></button>
          <button className="btn glass" onClick={() => go(i + 1, 1)} aria-label="Next mode"><CaretRight weight="bold" /></button>
        </div>
        <div className="slide-count num"><b>0{i + 1}</b> / 0{SLIDES.length}</div>
      </motion.section>
    </>
  )
}
