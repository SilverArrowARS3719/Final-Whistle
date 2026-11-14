import type { CSSProperties, ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

const SPRING = { stiffness: 180, damping: 18, mass: 0.6 }

// 3D tilt that follows the pointer, plus a moving light sheen. Motion values only: no React re-renders.
export default function Tilt({ children, max = 12, className, style }: { children: ReactNode; max?: number; className?: string; style?: CSSProperties }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(y, [0, 1], [max, -max]), SPRING)
  const rotateY = useSpring(useTransform(x, [0, 1], [-max, max]), SPRING)
  const gx = useTransform(x, (v) => v * 100)
  const gy = useTransform(y, (v) => v * 100)
  const sheen = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.35), transparent 55%)`

  if (reduce) return <div className={className} style={style}>{children}</div>
  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - r.left) / r.width)
        y.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5) }}
    >
      {children}
      <motion.div className="shine" style={{ background: sheen }} />
    </motion.div>
  )
}
