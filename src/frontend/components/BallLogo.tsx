import { motion, useReducedMotion } from 'motion/react'

// A classic black-and-white ball: a central pentagon, five neighbours peeking round the edge, and the seams.
const PENT = (cx: number, cy: number, r: number, rot = -90) =>
  Array.from({ length: 5 }, (_, k) => { const a = ((rot + k * 72) * Math.PI) / 180; return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}` }).join(' ')

/** The Final Whistle's mark: a football that drops in, bounces and keeps slowly turning. */
export default function BallLogo({ size = 64 }: { size?: number }) {
  const reduce = useReducedMotion()
  const outer = Array.from({ length: 5 }, (_, k) => { const a = ((-90 + k * 72) * Math.PI) / 180; return [50 + 41 * Math.cos(a), 50 + 41 * Math.sin(a)] })
  return (
    <motion.div className="ball-logo" style={{ width: size, height: size }}
      initial={reduce ? false : { y: -220, scale: 0.6, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ y: { type: 'spring', stiffness: 260, damping: 11, mass: 1.1, delay: 0.55 }, opacity: { duration: 0.2, delay: 0.55 }, scale: { duration: 0.5, delay: 0.55 } }}>
      <motion.svg viewBox="0 0 100 100" aria-hidden
        animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        <defs>
          <radialGradient id="ball-shade" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.6" stopColor="#e7ece4" />
            <stop offset="1" stopColor="#aab4ac" />
          </radialGradient>
          <clipPath id="ball-clip"><circle cx="50" cy="50" r="47" /></clipPath>
        </defs>
        <circle cx="50" cy="50" r="47" fill="url(#ball-shade)" />
        <g clipPath="url(#ball-clip)" fill="#121614">
          <polygon points={PENT(50, 50, 15)} />
          {outer.map(([x, y], k) => <polygon key={k} points={PENT(x, y, 13, -90 + k * 72 + 180)} />)}
        </g>
        <g clipPath="url(#ball-clip)" stroke="#121614" strokeWidth="2.2" strokeLinecap="round">
          {Array.from({ length: 5 }, (_, k) => {
            const a = ((-90 + k * 72) * Math.PI) / 180
            return <line key={k} x1={50 + 15 * Math.cos(a)} y1={50 + 15 * Math.sin(a)} x2={50 + 29 * Math.cos(a)} y2={50 + 29 * Math.sin(a)} />
          })}
        </g>
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth="1.5" />
      </motion.svg>
      <motion.span className="ball-shadow" aria-hidden initial={reduce ? false : { scaleX: 0.3, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.75, duration: 0.5 }} />
    </motion.div>
  )
}
