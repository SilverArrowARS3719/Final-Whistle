import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Robot } from '@phosphor-icons/react'
import type { Player } from '../data/players'
import { cpuPick, slotsOf, type Team } from '../engine/draft'
import { effectiveOvr } from '../engine/position'
import { makeRng } from '../engine/rng'
import { sfx } from '../engine/sfx'
import Pitch from './Pitch'
import PlayerCard from './PlayerCard'

/** The computer's turn: a short think, the pick is revealed, then play moves on. */
export default function CpuTurn({ team, slot, available, onPick }: { team: Team; slot: number; available: Player[]; onPick: (p: Player) => void }) {
  const [choice, setChoice] = useState<Player | null>(null)
  const done = useRef(false)
  const pos = slotsOf(team)[slot].pos
  useEffect(() => {
    const think = setTimeout(() => { setChoice(cpuPick(available, team, slot, makeRng(Date.now()))); sfx.pick() }, 700)
    return () => clearTimeout(think)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!choice) return
    const go = setTimeout(() => { if (!done.current) { done.current = true; onPick(choice) } }, 1300)
    return () => clearTimeout(go)
  }, [choice]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cpu-turn">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="label"><Robot weight="fill" /> Computer's pick</span>
          <h2>{team.name} {choice ? 'takes' : 'is picking a'} {choice ? choice.name : pos}{choice ? '.' : '…'}</h2>
        </div>
        {choice && <button className="btn ghost" onClick={() => { if (!done.current) { done.current = true; onPick(choice) } }}>Skip</button>}
      </div>
      <div className="cpu-stage">
        <div className="cpu-card">
          <AnimatePresence mode="wait">
            {choice
              ? <motion.div key="c" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}><PlayerCard p={choice} ovr={effectiveOvr(choice, pos)} tilt={false} /></motion.div>
              : <motion.div key="t" className="cpu-thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span className="spin lg" /></motion.div>}
          </AnimatePresence>
        </div>
        <Pitch team={team} active={slot} compact footer={false} />
      </div>
    </div>
  )
}
