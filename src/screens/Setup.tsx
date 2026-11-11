import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Robot, User, WifiHigh } from '@phosphor-icons/react'

const FORMATS: [number, string, string][] = [
  [2, 'Head to head', 'One match decides it.'],
  [3, 'Round robin', 'Everyone plays everyone once. Points, then goal difference.'],
  [4, 'Knockout', 'Semi-finals, then a final.'],
]

const CPU_NAMES = ['Robo Pep', 'Klopp-o-tron', 'Don Carlo 3000']

type Props = { onStart: (names: string[], cpu: boolean[]) => void; me?: string; onOnline?: () => void; cpuAllowed?: boolean }

export default function Setup({ onStart, me, onOnline, cpuAllowed = false }: Props) {
  const [count, setCount] = useState(2)
  const [names, setNames] = useState([me && me !== 'Guest' ? me : '', '', '', ''])
  const [cpu, setCpu] = useState([false, false, false, false])
  const isCpu = (i: number) => cpuAllowed && cpu[i]
  let bots = 0
  const used = names.slice(0, count).map((n, i) => (isCpu(i) ? CPU_NAMES[bots++] : n.trim() || `Player ${i + 1}`))
  const dupes = new Set(used.map((n) => n.toLowerCase())).size !== used.length
  const humans = used.filter((_, i) => !isCpu(i)).length

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
                {isCpu(i)
                  ? <span className="cpu-name"><Robot weight="fill" /> {used[i]} <span className="small dim">computer</span></span>
                  : <input
                      aria-label={`Player ${i + 1} name`}
                      value={names[i]}
                      maxLength={18}
                      placeholder={`Player ${i + 1}`}
                      onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                    />}
                {cpuAllowed && i > 0 && (
                  <button type="button" className={`btn sm ${isCpu(i) ? 'primary' : 'ghost'}`} aria-pressed={isCpu(i)} onClick={() => setCpu(cpu.map((c, j) => (j === i ? !c : c)))}>
                    {isCpu(i) ? <><Robot weight="bold" /> CPU</> : <><User weight="bold" /> Human</>}
                  </button>
                )}
              </motion.label>
            ))}
          </AnimatePresence>
          {dupes && <p className="small" style={{ color: 'var(--hot)' }}>Each player needs a different name.</p>}
          {cpuAllowed && <p className="small dim">On your own? Switch a seat to <b>CPU</b> and the computer drafts against you.</p>}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
        {onOnline && <button className="btn glass lg" onClick={onOnline}><WifiHigh weight="bold" /> Play online with friends</button>}
        <button className="btn primary lg" disabled={dupes || humans === 0} onClick={() => onStart(used, used.map((_, i) => isCpu(i)))}>
          Spin for pick order <ArrowRight weight="bold" />
        </button>
      </div>
    </div>
  )
}
