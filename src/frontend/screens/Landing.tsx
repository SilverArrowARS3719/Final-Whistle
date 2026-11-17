import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { ArrowRight, CalendarCheck, CaretLeft, CaretRight, Fire, LockSimple } from '@phosphor-icons/react'
import { dailyFor, dayKey, loadDaily, streakOf } from '../../game/engine/daily'
import Atmosphere from '../components/Atmosphere'
import Ticker from '../components/Ticker'
import { useProgress } from './Profile'
import { createPortal } from 'react-dom'
import { usePrefs } from '../prefs'

export type Mode = 'xi' | 'sot' | 'chaos' | 'auction' | 'winners'
type Slide = { mode: Mode | null; n: number; title: string; line: string; img: string; glow: string }

const SLIDES: Slide[] = [
  { mode: 'xi', n: 1, title: 'All-Time XI', line: 'Draft your best XI of all time. If someone already took him, he is gone.', img: 'img/xi.webp', glow: 'var(--accent-rgb)' },
  { mode: 'sot', n: 2, title: 'Stick or Twist', line: "You're dealt the players. Keep them or gamble a twist on someone better.", img: 'img/sot.webp', glow: '243 199 75' },
  { mode: 'chaos', n: 3, title: 'Chaos Draft', line: 'A normal draft, until the cards start flipping.', img: 'img/chaos.webp', glow: '108 195 255' },
  { mode: 'auction', n: 4, title: 'Auction', line: 'Open or blind bidding with a fixed budget. Build a 5 or 7-a-side team without going broke.', img: 'img/auction.webp', glow: '231 199 104' },
  { mode: 'winners', n: 5, title: 'Team of Winners', line: 'Spin for a trophy, take a player from whoever holds it. Then try to win everything in three seasons.', img: 'img/winners.webp', glow: '255 170 80' },
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
  const reduce = useReducedMotionConfig()
  const { effects } = usePrefs()
  const still = reduce || !effects // no slow zoom on the photos
  const [[i, dir], setSlide] = useState<[number, number]>([0, 1])
  // dir: +1 = new slide enters from the right (next / swipe left), -1 = from the left
  const go = (to: number, d = to >= i ? 1 : -1) => setSlide([(to + SLIDES.length) % SLIDES.length, d])
  const s = SLIDES[i]

  const [dragging, setDragging] = useState(false)
  const dragged = useRef(false)
  // autoplay keeps running on hover, pauses while dragging; each change restarts the timer
  useEffect(() => {
    if (reduce || dragging) return
    const id = setTimeout(() => setSlide([(i + 1) % SLIDES.length, 1]), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [i, reduce, dragging])


  // the first card is the mode on the left; the next two follow
  const shown = [0, 1, 2].map((k) => (i + k) % SLIDES.length)

  // trackpad swipe, mouse wheel and arrow keys switch modes, one step per swipe. After a swipe the
  // trackpad keeps sending fading "momentum" events; those are ignored, but a new swipe that starts
  // during them (speed jumps up again, or the direction turns) counts straight away.
  const gesture = useRef({ acc: 0, t: 0, mag: 0, sign: 0, locked: false, lockedAt: 0 })
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom
      if (e.target instanceof Element && e.target.closest('[role=dialog], [role=menu]')) return // scrolling a panel
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const g = gesture.current, now = performance.now(), mag = Math.abs(d), sign = Math.sign(d)
      const pause = now - g.t > 160
      const turned = sign !== 0 && g.sign !== 0 && sign !== g.sign
      const rising = mag > g.mag * 1.4 + 2 && now - g.lockedAt > 250
      g.t = now; g.mag = mag
      if (sign) g.sign = sign
      if (pause || turned) { g.acc = 0; g.locked = false }
      else if (g.locked) {
        if (!rising) return // momentum from the last swipe
        g.locked = false; g.acc = 0
      }
      g.acc += d
      if (Math.abs(g.acc) > 40) {
        const dir = Math.sign(g.acc) // read now: the updater below may run after acc is reset
        setSlide(([cur]) => [(cur + dir + SLIDES.length) % SLIDES.length, dir])
        g.acc = 0; g.locked = true; g.lockedAt = now
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
        <div className={`backdrop ${still ? 'still' : ''}`} aria-hidden>
          {/* CSS transitions, not JS: the slow zoom runs on the GPU and never waits for React */}
          {/* all five stay mounted so a slide never flashes; the one on screen downloads first */}
          {SLIDES.map((x, k) => <img key={x.n} src={x.img} alt="" decoding="async" draggable={false} fetchPriority={k === i ? 'high' : 'low'} className={`bd-slide ${k === i ? 'on' : ''}`} />)}
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
        // a drag that ends on a card or button must not also click it
        onPointerDownCapture={() => { dragged.current = false }}
        onClickCapture={(e) => { if (dragged.current) { e.stopPropagation(); e.preventDefault() } }}
        onDragStart={() => { dragged.current = true; setDragging(true) }}
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
              {k === i && !reduce && <span className="fill" key={i} style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}
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
              <span><span className="dp-long">Today's puzzle · </span>Daily Draft #{dailyFor(today).number}</span>
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
                <img src={x.img} alt="" draggable={false} />
                <span className="slide-card-foot">{pos === 0 ? <b>Now showing<span className="tap-hint"> · tap to play</span></b> : <>Mode {x.n}{!x.mode && ' · soon'}</>}</span>
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
