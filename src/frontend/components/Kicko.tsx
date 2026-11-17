import { motion, useReducedMotionConfig, type TargetAndTransition } from 'motion/react'

/** card: holds the red card up · hide: ducks out of sight (nobody's looking at your password) */
export type Pose = 'wave' | 'point' | 'cheer' | 'think' | 'whistle' | 'card' | 'hide'

// Kicko is a rendered photo, so his "poses" are movement: a bob, a lean, a jump, a duck.
const MOVES: Record<Pose, TargetAndTransition> = {
  wave: { y: [0, -4, 0], rotate: [-2, 2, -2], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
  point: { rotate: -6, x: -4, y: 0, transition: { type: 'spring', stiffness: 200, damping: 14 } },
  cheer: { y: [0, -16, 0], transition: { duration: 0.8, repeat: Infinity, ease: 'easeOut' } },
  think: { rotate: 5, y: 2, transition: { type: 'spring', stiffness: 160, damping: 16 } },
  whistle: { scale: [1, 1.04, 1], transition: { duration: 1.2, repeat: Infinity } },
  card: { rotate: [-1, 1, -1], scale: 1.03, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  hide: { y: '70%', rotate: 8, opacity: 0.25, transition: { type: 'spring', stiffness: 220, damping: 22 } },
}

/** Kicko, the panda referee: the game's mascot. */
export default function Kicko({ pose = 'wave', size = 160 }: { pose?: Pose; size?: number }) {
  const reduce = useReducedMotionConfig()
  return (
    <motion.div className="kicko" style={{ width: size, height: size * (314 / 348) }} animate={reduce ? (pose === 'hide' ? { opacity: 0.25 } : {}) : MOVES[pose]}>
      <img src="img/kicko.jpg" alt={pose === 'hide' ? 'Kicko, the panda referee, looking away' : 'Kicko, the panda referee mascot, holding a red card'} draggable={false} />
    </motion.div>
  )
}
