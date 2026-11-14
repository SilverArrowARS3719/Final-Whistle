import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { TEAMS, type Competition } from '../../game/data/winners'
import { sfx } from '../../game/engine/sfx'

// readable label colour on a club colour
const inkOn = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0b0f0c' : '#ffffff'
}

/**
 * Every competition still in play as a slice in its holder's colour. When `spin.at` changes the wheel spins
 * to `spin.comp` (shared state, so every device in an online game watches the same spin), then calls onLanded.
 */
export default function CompetitionWheel({ comps, spin, onLanded }: { comps: Competition[]; spin: { comp: string; at: number } | null; onLanded: () => void }) {
  const reduce = useReducedMotion()
  const rotate = useMotionValue(0)
  const seg = 360 / Math.max(comps.length, 1)
  const last = useRef(0)
  const shown = useRef<number | null>(null)
  const spinning = useRef(false)

  useMotionValueEvent(rotate, 'change', (v) => {
    const s = Math.floor(v / seg)
    if (s !== last.current) { last.current = s; if (spinning.current) sfx.tick() }
  })

  useEffect(() => {
    if (!spin || shown.current === spin.at) return
    shown.current = spin.at
    const i = comps.findIndex((c) => c.id === spin.comp)
    if (i < 0) return
    const current = rotate.get()
    // bring the middle of slice i under the pointer at the top
    const target = current - (current % 360) + 360 * 6 + (360 - (i * seg + seg / 2))
    spinning.current = true
    animate(rotate, target, reduce ? { duration: 0 } : { duration: 3.6, ease: [0.12, 0.8, 0.18, 1] }).then(() => {
      spinning.current = false
      sfx.flip()
      onLanded()
    })
  }, [spin]) // eslint-disable-line react-hooks/exhaustive-deps

  const gradient = comps.map((c, i) => {
    const [a, b] = TEAMS[c.winner].colors
    return `${i % 2 ? b === '#ffffff' ? a : b : a} ${i * seg}deg ${(i + 1) * seg}deg`
  }).join(', ')

  return (
    <div className="cw-stage">
      <div className="cw-pointer" aria-hidden />
      <motion.div className="cw-wheel" style={{ background: `conic-gradient(${gradient})`, rotate }} aria-label={`Wheel of ${comps.length} competitions`}>
        {comps.map((c, i) => {
          const [a, b] = TEAMS[c.winner].colors
          const bg = i % 2 ? (b === '#ffffff' ? a : b) : a
          return (
            <span key={c.id} className="cw-label" style={{ color: inkOn(bg), transform: `translate(-50%, -50%) rotate(${i * seg + seg / 2 - 90}deg) translateX(calc(var(--cw) * 0.62))` }}>
              {c.short}
            </span>
          )
        })}
        <div className="cw-hub" aria-hidden />
      </motion.div>
    </div>
  )
}
