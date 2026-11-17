import { useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotionConfig, useTransform, useVelocity, type AnimationPlaybackControls, type MotionValue } from 'motion/react'
import { sfx } from '../../game/engine/sfx'

const STEP = 20 // degrees between years round the drum
const ROW = 46 // px of drag per year
const RADIUS = 118 // px from the drum's axis to its face
const SHOWN = 5 // years drawn either side of the pocket

type Props = { value: number; onChange: (year: number) => void; min?: number; max?: number; label?: string }

/**
 * Year of birth on a curved drum, like a roulette wheel turned on its side. Drag it, flick it (it keeps
 * spinning and settles into a pocket), scroll it, or use the arrow keys. Every year that passes clicks.
 */
export default function AgeWheel({ value, onChange, min = new Date().getFullYear() - 100, max = new Date().getFullYear() - 5, label = 'Year of birth' }: Props) {
  const reduce = useReducedMotionConfig()
  const years = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max])
  const pos = useMotionValue(value - min) // fractional index; whole numbers are pockets
  const speed = useVelocity(pos)
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const drag = useRef<{ y: number; start: number; samples: [number, number][] } | null>(null)
  const last = useRef(Math.round(pos.get()))
  const wheelIdle = useRef(0)
  const current = useRef(value)

  // a click for each year that passes the pocket, a thud at either end
  useMotionValueEvent(pos, 'change', (p) => {
    const r = Math.round(p)
    if (r !== last.current) {
      last.current = r
      const edge = r <= 0 || r >= years.length - 1
      sfx.detent(edge)
      navigator.vibrate?.(edge ? 12 : 4)
    }
  })

  // outside changes (e.g. the form resetting) move the drum too
  useEffect(() => {
    if (value !== current.current) { current.current = value; settle(value - min) }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (i: number) => {
    const year = years[Math.max(0, Math.min(years.length - 1, i))]
    if (year !== current.current) { current.current = year; onChange(year) }
  }
  const settle = (target: number, velocity = 0) => {
    anim.current?.stop()
    const t = Math.max(0, Math.min(years.length - 1, Math.round(target)))
    anim.current = animate(pos, t, reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30, velocity })
    commit(t)
  }

  const down = (e: RPointerEvent) => {
    anim.current?.stop()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* pointer already gone: the drag still works while over the drum */ }
    drag.current = { y: e.clientY, start: pos.get(), samples: [[e.timeStamp, e.clientY]] }
  }
  const move = (e: RPointerEvent) => {
    const d = drag.current
    if (!d) return
    let p = d.start + (d.y - e.clientY) / ROW
    // rubber band past either end
    if (p < 0) p = p / 3
    if (p > years.length - 1) p = years.length - 1 + (p - (years.length - 1)) / 3
    pos.set(p)
    d.samples = [...d.samples.slice(-5), [e.timeStamp, e.clientY]]
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const [t0, y0] = d.samples[0], [t1, y1] = d.samples[d.samples.length - 1]
    const v = t1 > t0 ? ((y0 - y1) / ROW) / ((t1 - t0) / 1000) : 0 // years per second
    if (reduce || Math.abs(v) < 0.6) return settle(pos.get())
    // momentum: coast with the flick, then drop into the nearest pocket
    anim.current?.stop()
    anim.current = animate(pos, pos.get(), {
      type: 'inertia', velocity: v, power: 0.8, timeConstant: 380,
      min: 0, max: years.length - 1, bounceStiffness: 400, bounceDamping: 32,
      modifyTarget: (t) => Math.round(Math.max(0, Math.min(years.length - 1, t))),
      onComplete: () => commit(Math.round(pos.get())),
    })
  }
  const wheel = (e: React.WheelEvent) => {
    anim.current?.stop()
    pos.set(Math.max(-0.4, Math.min(years.length - 0.6, pos.get() + e.deltaY / ROW / 2)))
    clearTimeout(wheelIdle.current)
    wheelIdle.current = window.setTimeout(() => settle(pos.get()), 110)
  }
  const key = (e: KeyboardEvent) => {
    const i = Math.round(pos.get())
    const to = { ArrowUp: i + 1, ArrowDown: i - 1, PageUp: i + 10, PageDown: i - 10, Home: 0, End: years.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    settle(to)
  }

  const age = new Date().getFullYear() - value
  return (
    <div className="age-wheel">
      <div className="age-head">
        <span className="label" id="age-label">{label}</span>
        <motion.span key={age} className="age-now num" initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.25 }}>
          {age} years old
        </motion.span>
      </div>
      <div
        className="drum"
        role="spinbutton"
        tabIndex={0}
        aria-labelledby="age-label"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}, ${age} years old`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={wheel}
        onKeyDown={key}
      >
        <div className="drum-rail top" aria-hidden />
        <div className="drum-pocket" aria-hidden />
        <div className="drum-faces" aria-hidden>
          {years.map((y, i) => <Face key={y} i={i} year={y} pos={pos} speed={speed} />)}
        </div>
        <div className="drum-rail bottom" aria-hidden />
      </div>
      <span className="small dim age-hint">Drag, flick or scroll. Arrow keys work too.</span>
    </div>
  )
}

function Face({ i, year, pos, speed }: { i: number; year: number; pos: MotionValue<number>; speed: MotionValue<number> }) {
  const d = useTransform(pos, (p) => i - p)
  const transform = useTransform(d, (x) => (Math.abs(x) > SHOWN + 1 ? 'none' : `rotateX(${-x * STEP}deg) translateZ(${RADIUS}px)`))
  const opacity = useTransform(d, (x) => (Math.abs(x) > SHOWN ? 0 : Math.max(0, Math.cos((x * STEP * Math.PI) / 180)) ** 1.4))
  // further from the pocket, and faster spinning, both blur the numbers
  const filter = useTransform([d, speed] as MotionValue[], ([x, v]: number[]) => `blur(${Math.min(5, Math.abs(x) * 0.9 + Math.min(3, Math.abs(v) / 14)).toFixed(2)}px)`)
  const scale = useTransform(d, (x) => 1 + Math.max(0, 1 - Math.abs(x)) * 0.22)
  const color = useTransform(d, (x) => (Math.abs(x) < 0.5 ? 'var(--accent)' : 'var(--chalk)'))
  return (
    <motion.span className="drum-face num" style={{ transform, opacity, filter, color }}>
      <motion.b style={{ scale }}>{year}</motion.b>
    </motion.span>
  )
}
