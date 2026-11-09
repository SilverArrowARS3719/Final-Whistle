import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Lightning } from '@phosphor-icons/react'
import type { Active } from '../engine/chaos'
import { sfx } from '../engine/sfx'

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

/** Everyone's card for the round, flipped one after another, plus the table card if one landed. */
export function ChaosDeal({ deals, event, round, onDone, canContinue = true }: { deals: { name: string; a: Active | null }[]; event: Active | null; round: number; onDone: () => void; canContinue?: boolean }) {
  const reduce = useReducedMotion()
  const shown = event ? [...deals, { name: 'Everyone', a: event }] : deals
  useEffect(() => {
    const ids = shown.map((_, i) => setTimeout(sfx.flip, reduce ? 0 : 350 + i * 380))
    return () => ids.forEach(clearTimeout)
  }, [reduce, shown.length])
  return (
    <div className="chaos-stage">
      <span className="label">Round {round + 1} · Chaos Cards</span>
      <div className="chaos-deal">
        {shown.map(({ name, a }, i) => (
          <div key={i} className={`chaos-deal-slot ${event && i === shown.length - 1 ? 'table' : ''}`}>
            <b>{name}</b>
            <div className="chaos-flip-wrap">
              <motion.div
                className="chaos-flipper"
                initial={reduce ? false : { rotateY: 180, scale: 0.7, y: 40 }}
                animate={{ rotateY: 0, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 70, damping: 13, delay: 0.2 + i * 0.38 }}
              >
                <div className="chaos-back"><Lightning size={48} weight="fill" /></div>
                <div className="chaos-front">{a ? <CardFace a={a} /> : <div className="chaos-card none"><h3>Normal round</h3></div>}</div>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
      {canContinue ? (
        <motion.button className="btn primary lg" onClick={onDone} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + shown.length * 0.38 }} autoFocus>
          Play this round <ArrowRight weight="bold" />
        </motion.button>
      ) : <p className="dim">Waiting for the host to start the round…</p>}
    </div>
  )
}
