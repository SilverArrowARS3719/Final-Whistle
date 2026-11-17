import type { CSSProperties } from 'react'
import { LogoMark } from './Logo'

// Loading states drawn in the shape of what's coming, with one slow light sweep. No spinners.
const Bone = ({ w, h, r, style, className = '' }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties; className?: string }) =>
  <i className={`bone ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />

/** Rows of a list or table: a badge, two lines of text, something on the right. */
export function SkeletonRows({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="skel-rows" role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, k) => (
        <div key={k} className="skel-row" style={{ animationDelay: `${k * 0.08}s` }}>
          <Bone w={36} h={36} r={10} />
          <span><Bone w={`${62 - k * 9}%`} h={12} /><Bone w={`${34 + k * 6}%`} h={10} /></span>
          <Bone w={56} h={26} r={999} />
        </div>
      ))}
    </div>
  )
}

/** A player card being considered: photo, name, rating. */
export function CardSkeleton() {
  return (
    <div className="skel-card" role="status" aria-label="Thinking" aria-busy="true">
      <Bone w="100%" h="62%" r={12} />
      <Bone w="70%" h={16} />
      <span className="row" style={{ gap: 8 }}><Bone w={44} h={26} r={8} /><Bone w={64} h={12} /></span>
    </div>
  )
}

/** First paint while the account loads: the hero's own layout, greyed out. */
export function BootSkeleton() {
  return (
    <div className="shell skel-boot" role="status" aria-label="Loading The Final Whistle" aria-busy="true">
      <div className="topbar">
        {/* the brand is real from the first frame; only what's still loading is a bone */}
        <span className="wordmark"><LogoMark />THE <i>FINAL WHISTLE</i></span>
        <span className="row" style={{ gap: 10 }}><Bone w={40} h={40} r={999} /><Bone w={150} h={40} r={999} /></span>
      </div>
      <div className="skel-hero">
        <div className="skel-rail">{Array.from({ length: 5 }, (_, k) => <Bone key={k} w={3} h={44} r={2} />)}</div>
        <div className="skel-copy">
          <Bone w={120} h={12} />
          <Bone w="82%" h="clamp(48px, 7vw, 104px)" r={8} />
          <Bone w="58%" h="clamp(48px, 7vw, 104px)" r={8} />
          <Bone w="46%" h={14} style={{ marginTop: 12 }} />
          <Bone w={230} h={56} r={999} style={{ marginTop: 18 }} />
        </div>
        <div className="skel-cards">{[0, 1, 2].map((k) => <Bone key={k} w="100%" h="100%" r={16} />)}</div>
      </div>
    </div>
  )
}

/** A screen on its way: its heading and a few rows, while the screen's code arrives. */
export function PageSkeleton() {
  return (
    <div className="skel-page">
      <Bone w="min(440px, 72%)" h="clamp(40px, 5vw, 64px)" r={8} />
      <Bone w="min(320px, 52%)" h={14} />
      <SkeletonRows rows={4} label="Loading this screen" />
    </div>
  )
}
