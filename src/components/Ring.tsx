import { useEffect, useRef, useState } from 'react'

// Countdown that calls onExpire once at 0. Restarts whenever `resetKey` changes.
// While `paused`, the clock is frozen and restarts in full when unpaused.
export function useCountdown(seconds: number, onExpire: () => void, resetKey: unknown = 0, paused = false) {
  const [left, setLeft] = useState(seconds)
  const expire = useRef(onExpire)
  expire.current = onExpire
  useEffect(() => {
    if (paused) return
    const deadline = Date.now() + seconds * 1000
    setLeft(seconds)
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        clearInterval(id)
        expire.current()
      }
    }, 250)
    return () => clearInterval(id)
  }, [seconds, resetKey, paused])
  return left
}

export default function Ring({ left, total }: { left: number; total: number }) {
  const r = 28, c = 2 * Math.PI * r
  const low = left <= Math.min(10, total / 3)
  return (
    <div className={`ring ${low ? 'low' : ''}`}>
      <svg width="64" height="64" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--ink-4)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          stroke={low ? 'var(--hot)' : 'var(--accent)'}
          strokeDasharray={c} strokeDashoffset={c * (1 - left / total)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <span className="t" aria-label={`${left} seconds left`}>{left}</span>
    </div>
  )
}
