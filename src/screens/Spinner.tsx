import { useEffect, useRef, useState } from 'react'
import { usePersist } from '../engine/persist'
import { HostOnly, useIsHost } from '../online/context'
import { animate, motion, useAnimationControls, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowsClockwise, HandSwipeRight } from '@phosphor-icons/react'
import { makeRng, shuffle } from '../engine/rng'
import { sfx } from '../engine/sfx'

// Wheel segment colours: tints of the pitch/chalk palette plus the accent, so names stay readable in dark ink.
const COLORS = ['#d2ef5b', '#e9eee4', '#8fc9a0', '#c9d3c4']
const BULBS = 24

export default function Spinner({ names, onDone }: { names: string[]; onDone: (order: number[]) => void }) {
  const reduce = useReducedMotion()
  const [order, setOrder] = useState<number[] | null>(null)
  const [spinning, setSpinning] = useState(false)
  const rotate = useMotionValue(0)
  const flapper = useAnimationControls()
  const seg = 360 / names.length
  const lastSeg = useRef(0) // a ref, not state: ticks shouldn't re-render the wheel

  // tick + flapper kick every time a segment edge passes the pointer
  useMotionValueEvent(rotate, 'change', (v) => {
    const s = Math.floor(v / seg)
    if (s !== lastSeg.current) {
      lastSeg.current = s
      if (spinning) {
        sfx.tick()
        flapper.start({ rotate: [0, -22, 0], transition: { duration: 0.18 } })
      }
    }
  })

  // the result is shared, so every device in an online game spins to the same order
  const [shared, setShared] = usePersist<{ o: number[]; power: number; at: number } | null>('spin', null)
  const shown = useRef<number | null>(null)
  const host = useIsHost()
  useEffect(() => {
    if (shared && shown.current !== shared.at) { shown.current = shared.at; animateTo(shared.o, shared.power) }
  }, [shared])

  const spin = (power = 1) => {
    if (spinning || !host) return
    setShared({ o: shuffle(makeRng(Date.now()), names.map((_, i) => i)), power, at: Date.now() })
  }

  const animateTo = async (o: number[], power: number) => {
    const current = rotate.get()
    const turns = Math.round(5 + power * 3)
    // land the middle of segment o[0] under the top pointer
    const target = current - (current % 360) + 360 * turns + (360 - (o[0] * seg + seg / 2))
    setOrder(null)
    setSpinning(true)
    await animate(rotate, target, reduce ? { duration: 0 } : { duration: 3.4 + power, ease: [0.12, 0.8, 0.18, 1] })
    setSpinning(false)
    setOrder(o)
    sfx.perfect()
  }

  const gradient = names.map((_, i) => `${COLORS[i]} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ')
  return (
    <div className="spinner-page">
      <div className="wheel-stage">
        <motion.div className="wheel-tilt" initial={{ rotateX: 60, opacity: 0, scale: 0.8 }} animate={{ rotateX: 18, opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          <motion.div className="pointer" animate={flapper} style={{ originY: 0 }} />
          <div className={`bulbs ${spinning ? 'chase' : order ? 'win' : ''}`} aria-hidden>
            {Array.from({ length: BULBS }, (_, k) => (
              <span key={k} style={{ transform: `rotate(${(k * 360) / BULBS}deg) translateY(calc(var(--r) * -1))`, animationDelay: `${(k % 3) * 0.12}s` }} />
            ))}
          </div>
          <motion.div
            className="wheel"
            style={{ background: `conic-gradient(${gradient})`, rotate }}
            // flick the wheel: drag left or right and let go
            onPanEnd={(_, info) => Math.abs(info.velocity.x) + Math.abs(info.velocity.y) > 200 && spin(Math.min(2, (Math.abs(info.velocity.x) + Math.abs(info.velocity.y)) / 1500))}
          >
            {names.map((n, i) => (
              <span key={i} className="wheel-label" style={{ transform: `translate(-50%, -50%) rotate(${i * seg + seg / 2}deg) translateY(calc(var(--r) * -0.62))` }}>
                {n}
              </span>
            ))}
            <div className="wheel-hub"><span className="num">{order ? '!' : '?'}</span></div>
          </motion.div>
        </motion.div>
        {order && <div className="win-burst" aria-hidden />}
      </div>

      <div className="stack spinner-side">
        {order ? (
          <motion.div className="stack" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="dim">First pick goes to</span>
            <motion.h2 className="winner-name" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }}>
              {names[order[0]]}
            </motion.h2>
            <div className="order-list">
              {order.map((i, k) => (
                <motion.div
                  key={i}
                  className="panel"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + k * 0.08, type: 'spring', stiffness: 260, damping: 24 }}
                >
                  <b>{k + 1}</b>
                  <span>{names[i]}</span>
                </motion.div>
              ))}
            </div>
            <p className="dim small">The order snakes: whoever picks last in a round also picks first in the next.</p>
            <div className="row">
              <HostOnly>
                <button className="btn ghost" onClick={() => spin()}><ArrowsClockwise /> Spin again</button>
                <button className="btn primary lg" onClick={() => onDone(order)}>Continue <ArrowRight weight="bold" /></button>
              </HostOnly>
            </div>
          </motion.div>
        ) : (
          <div className="stack">
            <h2>Who picks first?</h2>
            <p className="dim"><HandSwipeRight weight="bold" /> Flick the wheel, or press the button.</p>
            <HostOnly note="Waiting for the host to spin">
              <div>
                <button className="btn primary lg" disabled={spinning} onClick={() => spin()}>
                  {spinning ? 'Spinning…' : 'Spin the wheel'}
                </button>
              </div>
            </HostOnly>
          </div>
        )}
      </div>
    </div>
  )
}
