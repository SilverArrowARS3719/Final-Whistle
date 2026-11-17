import { motion, useReducedMotionConfig } from 'motion/react'

// The Final Whistle's F: a slanted top arm, a shorter middle arm, and a stem split by one diagonal cut.
// Drawn in the theme's accent (currentColor), so it follows the colour theme like the rest of the brand.
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`logo-mark ${className}`} viewBox="178 211 347 457" aria-hidden focusable="false">
      <path fill="currentColor" d="M265 228 L523 213 L488 292 L332 300 L324 357 L442 362 L410 436 L305 446 L300 462 L186 577 L180 386 L236 382 Z" />
      <path fill="currentColor" d="M243 530 L306 468 L246 666 Z" />
    </svg>
  )
}

/** The mark on its dark tile, dropping in from above: the badge at the top of the login card. */
export function LogoBadge({ size = 76 }: { size?: number }) {
  const reduce = useReducedMotionConfig()
  return (
    <motion.span className="logo-badge" style={{ width: size, height: size }} role="img" aria-label="The Final Whistle"
      initial={reduce ? false : { y: -220, scale: 0.6, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ y: { type: 'spring', stiffness: 260, damping: 13, mass: 1.1, delay: 0.55 }, opacity: { duration: 0.2, delay: 0.55 }, scale: { duration: 0.5, delay: 0.55 } }}>
      <LogoMark />
    </motion.span>
  )
}
