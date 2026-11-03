import { type ReactNode } from 'react'
import { usePersist } from '../engine/persist'
import { HostOnly, Turn } from '../online/context'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, WarningCircle } from '@phosphor-icons/react'
import { FORMATION_NAMES, shapeFormation, type Slot } from '../data/formations'
import Pitch from '../components/Pitch'
import Seg from '../components/Seg'
import { newTeam } from '../engine/draft'

export type FormationChoice = { label: string; slots?: Slot[] }
const CUSTOM = 'Custom'

type Props = { names: string[]; order: number[]; onDone: (f: FormationChoice[]) => void; extra?: ReactNode }

export default function FormationPick({ names, order, onDone, extra }: Props) {
  // shared, so in an online game everyone picks their own shape at the same time
  const [fs, setFs] = usePersist('formation:fs', () => names.map(() => FORMATION_NAMES[0]))
  const [typed, setTyped] = usePersist('formation:typed', () => names.map(() => '4-1-4-1'))

  // custom shapes that don't parse fall back to the preset for the pitch preview, and block Start
  const parsed = names.map((_, i) => (fs[i] === CUSTOM ? shapeFormation(typed[i]) : null))
  const choice = (i: number): FormationChoice => {
    const r = parsed[i]
    return r && 'slots' in r ? { label: r.label, slots: r.slots } : { label: fs[i] === CUSTOM ? FORMATION_NAMES[0] : fs[i] }
  }
  const ready = parsed.every((r) => !r || 'slots' in r)

  return (
    <div>
      <div className="screen-head">
        <h2>Pick a shape.</h2>
        <HostOnly note="The host starts the draft when everyone is ready">
          <button className="btn primary lg" disabled={!ready} onClick={() => onDone(names.map((_, i) => choice(i)))}>
            Start the draft <ArrowRight weight="bold" />
          </button>
        </HostOnly>
      </div>
      {extra}
      <div className="formations">
        {order.map((i, k) => {
          const c = choice(i)
          const r = parsed[i]
          const error = r && 'error' in r ? r.error : null
          return (
            <motion.div
              key={i}
              className="panel pad stack"
              initial={{ opacity: 0, y: 40, rotateX: 20 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: k * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3>{names[i]}</h3>
              <Turn seat={i} note={`${names[i]} is choosing`}>
              <Seg id={`f${i}`} options={[...FORMATION_NAMES, CUSTOM]} value={fs[i]} onChange={(f) => setFs(fs.map((x, j) => (j === i ? f : x)))} />
              <AnimatePresence initial={false}>
                {fs[i] === CUSTOM && (
                  <motion.label
                    className="field shape-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="label">Type your shape (outfield players, from the back)</span>
                    <input
                      className={`num shape-input ${error ? 'bad' : ''}`}
                      value={typed[i]}
                      inputMode="numeric"
                      placeholder="4-4-2"
                      aria-invalid={!!error}
                      onChange={(e) => setTyped(typed.map((t, j) => (j === i ? e.target.value : t)))}
                    />
                    {error && <span className="shape-error" role="alert"><WarningCircle weight="fill" /> {error}</span>}
                  </motion.label>
                )}
              </AnimatePresence>
              </Turn>
              <Pitch team={newTeam(names[i], c.label, c.slots)} footer={false} compact />
            </motion.div>
          )
        })}
      </div>
      <p className="dim small" style={{ marginTop: 16 }}>
        Slots fill in this order: keeper, defence left to right, midfield, attack. One slot per round.
      </p>
    </div>
  )
}
