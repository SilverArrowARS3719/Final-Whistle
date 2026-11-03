import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, WifiHigh } from '@phosphor-icons/react'

const FORMATS: [number, string, string][] = [
  [2, 'Head to head', 'One match decides it.'],
  [3, 'Round robin', 'Everyone plays everyone once. Points, then goal difference.'],
  [4, 'Knockout', 'Semi-finals, then a final.'],
]

export default function Setup({ onStart, me, onOnline }: { onStart: (names: string[]) => void; me?: string; onOnline?: () => void }) {
  const [count, setCount] = useState(2)
  const [names, setNames] = useState([me && me !== 'Guest' ? me : '', '', '', ''])
  const used = names.slice(0, count).map((n, i) => n.trim() || `Player ${i + 1}`)
  const dupes = new Set(used.map((n) => n.toLowerCase())).size !== used.length

  return (
    <div>
      <div className="screen-head">
        <h2>Who's playing?</h2>
      </div>
      <div className="setup">
        <div className="count-tiles" role="radiogroup" aria-label="Number of players">
          {FORMATS.map(([c, title, line]) => (
            <button key={c} role="radio" aria-checked={count === c} className={`count-tile ${count === c ? 'on' : ''}`} onClick={() => setCount(c)}>
              <span className="count-num">{c}</span>
              <span className="count-copy"><b>{title}</b><span>{line}</span></span>
              {count === c && <motion.span layoutId="count-glow" className="count-glow" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
            </button>
          ))}
        </div>
        <div className="panel pad names">
          <AnimatePresence initial={false}>
            {used.map((_, i) => (
              <motion.label
                key={i}
                className="name-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <span className="seat num" aria-hidden>{i + 1}</span>
                <input
                  aria-label={`Player ${i + 1} name`}
                  value={names[i]}
                  maxLength={18}
                  placeholder={`Player ${i + 1}`}
                  onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                />
              </motion.label>
            ))}
          </AnimatePresence>
          {dupes && <p className="small" style={{ color: 'var(--hot)' }}>Each player needs a different name.</p>}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
        {onOnline && <button className="btn glass lg" onClick={onOnline}><WifiHigh weight="bold" /> Play online with friends</button>}
        <button className="btn primary lg" disabled={dupes} onClick={() => onStart(used)}>
          Spin for pick order <ArrowRight weight="bold" />
        </button>
      </div>
    </div>
  )
}
