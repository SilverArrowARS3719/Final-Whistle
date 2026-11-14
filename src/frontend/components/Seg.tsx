import { motion } from 'motion/react'

// Segmented control with a sliding pill (shared layoutId per control).
export default function Seg<T extends string | number>({ options, value, onChange, id, label = String }: {
  options: T[]
  value: T
  onChange: (v: T) => void
  id: string
  label?: (v: T) => string
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={String(o)} role="radio" aria-checked={o === value} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>
          {o === value && <motion.span layoutId={`seg-${id}`} className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span>{label(o)}</span>
        </button>
      ))}
    </div>
  )
}
