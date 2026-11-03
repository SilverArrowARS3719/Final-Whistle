import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Lightning } from '@phosphor-icons/react'
import type { Active } from '../engine/chaos'
import { sfx } from '../engine/sfx'
import Tilt from './Tilt'

const LABEL = { restriction: 'Restriction', modifier: 'Modifier', wild: 'Wild card', none: 'No effect' }

// The card face, used both for the big flip and the docked version.
export function CardFace({ a, small }: { a: Active; small?: boolean }) {
  return (
    <div className={`chaos-card ${a.card.rarity} ${a.card.category} ${small ? 'small' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="label">{LABEL[a.card.category]}</span>
        <span className="rarity">{a.card.rarity}</span>
      </div>
      <h3>{a.card.name}</h3>
      <p>{a.card.description(a.ctx)}</p>
    </div>
  )
}

export default function ChaosFlip({ a, round, onDone, canContinue = true }: { a: Active; round: number; onDone: () => void; canContinue?: boolean }) {
  const reduce = useReducedMotion()
  useEffect(() => { const id = setTimeout(sfx.flip, reduce ? 0 : 450); return () => clearTimeout(id) }, [reduce])
  return (
    <div className="chaos-stage">
      <span className="label">Round {round + 1} · Chaos Card</span>
      <div className="chaos-flip-wrap">
        <motion.div
          className="chaos-flipper"
          initial={reduce ? false : { rotateY: 180, scale: 0.6, y: 60 }}
          animate={{ rotateY: 0, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 60, damping: 12, delay: 0.25 }}
        >
          <div className="chaos-back"><Lightning size={64} weight="fill" /></div>
          <Tilt className="chaos-front" max={10}><CardFace a={a} /></Tilt>
        </motion.div>
      </div>
      {canContinue ? (
        <motion.button className="btn primary lg" onClick={onDone} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} autoFocus>
          Play this round <ArrowRight weight="bold" />
        </motion.button>
      ) : <p className="dim">Waiting for the host to start the round…</p>}
    </div>
  )
}
