import { motion, useReducedMotion } from 'motion/react'

/** card: holds the red card up · hide: card over his eyes (nobody's looking) */
export type Pose = 'wave' | 'point' | 'cheer' | 'think' | 'whistle' | 'card' | 'hide'

// Arms hang straight down from the shoulders; each pose is a rotation from there (degrees, clockwise).
const ARMS: Record<Pose, { left: number | number[]; right: number | number[]; card: boolean; eyes: 'open' | 'happy' | 'shut' }> = {
  wave: { left: [130, 160, 130], right: 8, card: false, eyes: 'happy' },
  point: { left: 10, right: -105, card: false, eyes: 'open' },
  cheer: { left: [145, 160, 145], right: [-145, -160, -145], card: false, eyes: 'happy' },
  think: { left: 8, right: 128, card: false, eyes: 'open' },
  whistle: { left: 8, right: 132, card: false, eyes: 'shut' },
  card: { left: 8, right: [-165, -175, -165], card: true, eyes: 'open' },
  hide: { left: -160, right: 160, card: true, eyes: 'shut' },
}

/**
 * Kicko, the game's mascot: a panda referee in the black-and-white stripes, red card at the ready.
 * Each pose is a small loop so he feels alive without stealing the page.
 */
export default function Kicko({ pose = 'wave', size = 160 }: { pose?: Pose; size?: number }) {
  const reduce = useReducedMotion()
  const a = ARMS[pose]
  const spin = (v: number | number[], dur: number) =>
    Array.isArray(v) && !reduce ? { animate: { rotate: v }, transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const } }
      : { animate: { rotate: Array.isArray(v) ? v[0] : v }, transition: { type: 'spring' as const, stiffness: 200, damping: 16 } }
  const bounce = pose === 'cheer' ? [0, -12, 0] : [0, -3, 0]

  return (
    <motion.svg className="kicko" width={size} height={size * 1.25} viewBox="0 0 160 200" role="img" aria-label="Kicko, the panda referee"
      {...(reduce ? {} : { animate: { y: bounce }, transition: { duration: pose === 'cheer' ? 0.8 : 2.4, repeat: Infinity, ease: 'easeInOut' } })}>
      <defs>
        <radialGradient id="kk-fur" cx="40%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" /><stop offset="0.7" stopColor="#ecebe6" /><stop offset="1" stopColor="#c9c7c0" /></radialGradient>
        <clipPath id="kk-shirt"><rect x="46" y="106" width="68" height="52" rx="18" /></clipPath>
      </defs>
      <ellipse cx="80" cy="194" rx="38" ry="5" fill="rgb(0 0 0 / 0.3)" />
      {/* legs and boots */}
      <rect x="54" y="150" width="52" height="20" rx="8" fill="#121212" />
      <rect x="56" y="166" width="18" height="20" rx="8" fill="#1c1c1c" />
      <rect x="86" y="166" width="18" height="20" rx="8" fill="#1c1c1c" />
      <rect x="51" y="182" width="25" height="10" rx="5" fill="#2a2a2a" />
      <rect x="84" y="182" width="25" height="10" rx="5" fill="#2a2a2a" />
      {/* referee shirt: white with black stripes */}
      <rect x="46" y="106" width="68" height="52" rx="18" fill="#f4f4f0" />
      <g clipPath="url(#kk-shirt)" fill="#151515">
        {[50, 64, 78, 92, 106].map((x) => <rect key={x} x={x} y="100" width="7" height="64" />)}
      </g>
      <path d="M68 108l12 12 12-12" fill="none" stroke="#151515" strokeWidth="4" strokeLinejoin="round" />
      <rect x="86" y="124" width="5" height="12" rx="2" fill="#f3c74b" />
      {/* ears behind the head */}
      <circle cx="49" cy="38" r="13" fill="#151515" />
      <circle cx="111" cy="38" r="13" fill="#151515" />
      {/* head */}
      <motion.g animate={{ rotate: pose === 'think' ? -8 : 0 }} style={{ originX: '80px', originY: '100px', transformBox: 'view-box' }}>
        <circle cx="80" cy="68" r="40" fill="url(#kk-fur)" />
        <ellipse cx="63" cy="70" rx="11" ry="14" fill="#151515" transform="rotate(-28 63 70)" />
        <ellipse cx="97" cy="70" rx="11" ry="14" fill="#151515" transform="rotate(28 97 70)" />
        {a.eyes === 'shut'
          ? <><path d="M58 71q5 -4 10 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><path d="M92 71q5 -4 10 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></>
          : a.eyes === 'happy'
            ? <><path d="M58 72q5 -6 10 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" /><path d="M92 72q5 -6 10 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></>
            : <motion.g {...(reduce ? {} : { animate: { scaleY: [1, 1, 0.1, 1] }, transition: { duration: 4, repeat: Infinity, times: [0, 0.93, 0.96, 1] } })} style={{ originY: '70px', transformBox: 'view-box' }}>
                <circle cx="64" cy="70" r="4.5" fill="#fff" /><circle cx="96" cy="70" r="4.5" fill="#fff" />
                <circle cx="65" cy="71" r="2.4" fill="#151515" /><circle cx="97" cy="71" r="2.4" fill="#151515" />
              </motion.g>}
        <ellipse cx="80" cy="85" rx="5" ry="3.6" fill="#151515" />
        {pose === 'whistle'
          ? <circle cx="80" cy="95" r="3.5" fill="#151515" />
          : <path d="M74 91q3 4 6 0q3 4 6 0" fill="none" stroke="#151515" strokeWidth="2" strokeLinecap="round" />}
        <ellipse cx="56" cy="86" rx="5" ry="3" fill="#ff9aa2" opacity="0.5" />
        <ellipse cx="104" cy="86" rx="5" ry="3" fill="#ff9aa2" opacity="0.5" />
      </motion.g>
      {/* arms in front: pivot at the shoulders */}
      <motion.g initial={false} style={{ originX: '50px', originY: '116px', transformBox: 'view-box' }} {...spin(a.left, 1.4)}>
        <path d="M50 116v40" stroke="#151515" strokeWidth="13" strokeLinecap="round" />
        <circle cx="50" cy="160" r="8" fill="#0d0d0d" />
      </motion.g>
      <motion.g initial={false} style={{ originX: '110px', originY: '116px', transformBox: 'view-box' }} {...spin(a.right, pose === 'cheer' ? 0.8 : 1.6)}>
        <path d="M110 116v40" stroke="#151515" strokeWidth="13" strokeLinecap="round" />
        {a.card && <rect x="100" y="158" width="22" height="30" rx="3" fill="#e5322d" stroke="#8f1714" strokeWidth="1.5" transform="rotate(8 111 173)" />}
        <circle cx="110" cy="160" r="8" fill="#0d0d0d" />
      </motion.g>
      {pose === 'whistle' && !reduce && [0, 1, 2].map((k) => (
        <motion.path key={k} d="M98 90q8 -6 0 -12" fill="none" stroke="#d2ef5b" strokeWidth="3" strokeLinecap="round"
          animate={{ opacity: [0, 1, 0], x: [0, 12 + k * 8, 20 + k * 10] }} transition={{ duration: 1.2, repeat: Infinity, delay: k * 0.25 }} />
      ))}
    </motion.svg>
  )
}
