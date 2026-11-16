import { motion, useReducedMotion } from 'motion/react'

// Fixed cloud layout (left %, top %, width px, seconds to drift across, start offset)
const CLOUDS = [
  [4, 8, 260, 90, 0], [38, 4, 200, 120, -40], [66, 12, 300, 100, -20], [18, 22, 180, 140, -70], [80, 26, 220, 110, -55], [52, 30, 160, 130, -90],
] as const

/**
 * Matchday sky over a striped pitch: drifting clouds, a low sun, a stadium roofline with floodlights, and
 * mown grass in perspective. All drawn in CSS so it is sharp at any size and costs no image download.
 */
export default function SkyPitch() {
  const reduce = useReducedMotion()
  return (
    <div className="sky" aria-hidden>
      <div className="sky-sun" />
      {CLOUDS.map(([x, y, w, dur, off], k) => (
        <motion.span key={k} className="cloud" style={{ left: `${x}%`, top: `${y}%`, width: w, height: w * 0.36 }}
          animate={reduce ? undefined : { x: ['-10vw', '30vw'] }} transition={{ duration: dur, repeat: Infinity, repeatType: 'mirror', ease: 'linear', delay: off }} />
      ))}
      <div className="stadium">
        <span className="roof" />
        {[12, 34, 66, 88].map((x) => <span key={x} className="mast" style={{ left: `${x}%` }}><i /></span>)}
        <span className="stand" />
      </div>
      <div className="grass"><div className="grass-plane" /></div>
    </div>
  )
}
