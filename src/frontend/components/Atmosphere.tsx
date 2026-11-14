import { useReducedMotion } from 'motion/react'

// Fixed positions from the index, so the stands don't reshuffle on every render.
const rand = (i: number, n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x) }
const FLASHES = Array.from({ length: 26 }, (_, i) => ({ left: rand(i, 1) * 100, top: 6 + rand(i, 2) * 44, delay: rand(i, 3) * 9, dur: 4 + rand(i, 4) * 6 }))

/** Camera flashes going off in the stands: the crowd is in, even when you play alone. */
export default function Atmosphere({ fixed = true }: { fixed?: boolean }) {
  if (useReducedMotion()) return null
  return (
    <div className={`atmos ${fixed ? 'fixed' : ''}`} aria-hidden>
      {FLASHES.map((f, i) => <i key={i} style={{ left: `${f.left}%`, top: `${f.top}%`, animationDelay: `-${f.delay}s`, animationDuration: `${f.dur}s` }} />)}
    </div>
  )
}

const COLOURS = ['var(--accent)', 'var(--chalk)', 'var(--amber)']
const PIECES = Array.from({ length: 48 }, (_, i) => ({
  left: rand(i, 5) * 100, delay: rand(i, 6) * 0.9, dur: 2.6 + rand(i, 7) * 2.2, spin: 360 + rand(i, 8) * 720, drift: (rand(i, 9) - 0.5) * 160, colour: COLOURS[i % 3], wide: i % 4 === 0,
}))

/** One burst when something is won. Falls once, then it's gone. */
export function Confetti() {
  if (useReducedMotion()) return null
  return (
    <div className="confetti" aria-hidden>
      {PIECES.map((p, i) => (
        <i key={i} className={p.wide ? 'wide' : ''} style={{ left: `${p.left}%`, background: p.colour, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, ['--spin' as string]: `${p.spin}deg`, ['--drift' as string]: `${p.drift}px` }} />
      ))}
    </div>
  )
}
