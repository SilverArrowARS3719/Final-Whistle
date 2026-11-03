import { AnimatePresence, motion } from 'motion/react'
import { lineOf } from '../engine/position'
import type { MatchEvent, MatchResult } from '../engine/sim'

// Broadcast-style view of the precomputed match. Positions are derived from each team's shape and
// tactics, who has the ball this minute, and any shot/goal event on this step. It illustrates the
// sim; it does not drive it.

type Props = { result: MatchResult; step: number; score: [number, number] }

const noise = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x) - 0.5
}
const surname = (n: string) => n.split(' ').slice(-1)[0]

export default function MatchTV({ result, step, score }: Props) {
  const label = result.labels[step]
  const pens = label === 'PENS'
  const attacker = step > 0 && !pens ? (result.possA[step] - result.possA[step - 1] ? 0 : 1) : -1
  const stepEvents = result.events.filter((e) => e.step === step)
  const shot = stepEvents.find((e) => e.type === 'goal' || e.type === 'shot')
  const caption = [...result.events].reverse().find((e) => e.step <= step && e.step > step - 9 && e.type !== 'shot' && e.type !== 'info')

  // [x, y] in 0..1 pitch space; side 0 attacks to the right.
  const place = (side: 0 | 1, i: number): [number, number] => {
    const slot = result.shapes[side][i]
    const t = result.tactics[side]
    const line = lineOf(slot.pos)
    const depth = (100 - slot.y) / 100
    let ax = 0.05 + depth * 0.52
    if (line !== 'GK') {
      if (attacker === side) ax += 0.12 + (shot && shot.side === side && line === 'ATT' ? 0.08 : 0)
      else if (attacker === 1 - side) ax -= 0.05
      if (line === 'DEF') ax += (t.line - 5) * 0.012
      ax += noise(step * 31 + i + side * 97) * 0.035
    }
    let ay = 0.5 + (slot.x / 100 - 0.5) * (0.78 + (t.width - 5) * 0.04)
    if (line !== 'GK') ay += noise(step * 17 + i * 3 + side * 51) * 0.04
    ax = Math.min(0.97, Math.max(0.03, ax))
    ay = Math.min(0.95, Math.max(0.05, ay))
    return side === 0 ? [ax, ay] : [1 - ax, 1 - ay]
  }

  const lines = result.snapshots[step]
  const live = (side: 0 | 1) => lines[side].slice(0, 11)

  // who has the ball: the shooter on a shot step, otherwise a midfielder/forward chosen per minute
  let holder: [0 | 1, number] | null = null
  if (attacker >= 0) {
    const side = attacker as 0 | 1
    const xi = live(side)
    const named = shot ? xi.findIndex((l) => l.name === (shot as MatchEvent).player) : -1
    if (named >= 0) holder = [side, named]
    else {
      const outfield = xi.map((l, i) => [l, i] as const).filter(([l, i]) => !l.off && lineOf(result.shapes[side][i].pos) !== 'GK')
      const k = Math.floor((noise(step * 7 + 3) + 0.5) * outfield.length)
      holder = [side, outfield[Math.min(k, outfield.length - 1)][1]]
    }
  }

  let ball: [number, number] = [0.5, 0.5]
  if (pens) ball = [0.885, 0.5]
  else if (shot) {
    const goalX = shot.side === 0 ? 1.0 : 0.0
    ball = shot.type === 'goal' ? [goalX + (shot.side === 0 ? 0.012 : -0.012), 0.5 + noise(step) * 0.08] : [goalX + (shot.side === 0 ? -0.01 : 0.01), shot.onTarget ? 0.47 : noise(step) > 0 ? 0.36 : 0.64]
  } else if (holder) {
    const [hx, hy] = place(holder[0], holder[1])
    ball = [hx + (holder[0] === 0 ? 0.012 : -0.012), hy + 0.01]
  }

  const [na, nb] = result.names
  return (
    <div className="tv">
      <div className="tv-bug">
        <span className="tv-team a">{na}</span>
        <span className="num tv-score">{score[0]}-{score[1]}</span>
        <span className="tv-team b">{nb}</span>
        <span className="num tv-clock">{label}</span>
      </div>
      <div className="tv-cam">
        <div className="tv-pitch">
          <svg className="tv-lines" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden>
            <rect x="0.5" y="0.5" width="104" height="67" />
            <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" />
            <circle cx="52.5" cy="34" r="9.15" />
            <rect x="0.5" y="13.85" width="16.5" height="40.3" />
            <rect x="88" y="13.85" width="16.5" height="40.3" />
            <rect x="0.5" y="24.85" width="5.5" height="18.3" />
            <rect x="99" y="24.85" width="5.5" height="18.3" />
            <rect x="-1.5" y="30.34" width="2" height="7.32" className="goal" />
            <rect x="104.5" y="30.34" width="2" height="7.32" className="goal" />
          </svg>
          {([0, 1] as const).map((side) =>
            live(side).map((l, i) => {
              if (l.off) return null
              const [x, y] = place(side, i)
              const has = holder && holder[0] === side && holder[1] === i
              return (
                <div key={`${side}-${i}`} className={`tv-dot s${side} ${lineOf(result.shapes[side][i].pos) === 'GK' ? 'gk' : ''}`} style={{ transform: `translate(calc(${x * 100}cqw - 50%), calc(${y * 100}cqh - 50%))` }}>
                  {has && <span className="tv-tag">{surname(l.name)}</span>}
                </div>
              )
            }),
          )}
          <div className={`tv-ball ${shot ? 'fast' : ''}`} style={{ transform: `translate(calc(${ball[0] * 100}cqw - 50%), calc(${ball[1] * 100}cqh - 50%))` }} />
        </div>
      </div>
      <AnimatePresence>
        {caption && (
          <motion.div
            key={`${caption.step}-${caption.text}`}
            className={`tv-caption ${caption.type}`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            <span className="num">{caption.clock}</span> {caption.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
