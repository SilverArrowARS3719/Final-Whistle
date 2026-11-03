import { usePersist } from '../engine/persist'
import { HostOnly, useOnline } from '../online/context'
import { motion } from 'motion/react'
import { ArrowRight, Check } from '@phosphor-icons/react'
import Pitch from '../components/Pitch'
import type { Team } from '../engine/draft'

export default function DraftDone({ teams, onAllDone }: { teams: Team[]; onAllDone: () => void }) {
  const [done, setDone] = usePersist('done:flags', () => teams.map(() => false))
  const o = useOnline()
  return (
    <div>
      <div className="screen-head">
        <h2>Squads are in.</h2>
        <HostOnly note="The host moves on once everyone is done">
          <button className="btn primary lg" disabled={!done.every(Boolean)} onClick={onAllDone}>
            To the tournament <ArrowRight weight="bold" />
          </button>
        </HostOnly>
      </div>
      <div className="formations">
        {teams.map((t, i) => (
          <motion.div
            key={i}
            className="panel pad stack"
            initial={{ opacity: 0, y: 40, rotateX: 18 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3>{t.name}</h3>
            <Pitch team={t} compact />
            <p className="small dim">Bench: {t.bench.map((b) => `${b.name} (${b.ovr})`).join(', ')}</p>
            <button className={`btn ${done[i] ? 'ghost' : 'primary'}`} disabled={done[i] || (o.online && o.mySeat !== i)} onClick={() => setDone(done.map((d, j) => d || j === i))}>
              {done[i] ? <><Check weight="bold" /> Done</> : 'Done choosing'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
