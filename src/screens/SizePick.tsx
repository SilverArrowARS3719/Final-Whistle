import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { SMALL_SIDED } from '../data/formations'
import Pitch from '../components/Pitch'
import Seg from '../components/Seg'
import { AUCTION } from '../engine/config'
import { newTeam } from '../engine/draft'
import type { AuctionKind } from '../engine/auction'

export const budgetFor = (size: 5 | 7) => (AUCTION.budgetPer5 * size) / 5

export default function SizePick({ onDone }: { onDone: (size: 5 | 7, kind: AuctionKind) => void }) {
  const [size, setSize] = useState<5 | 7>(5)
  const [kind, setKind] = useState<AuctionKind>('classic')
  return (
    <div>
      <div className="screen-head">
        <h2>How many a side?</h2>
        <button className="btn primary lg" onClick={() => onDone(size, kind)}>Open the auction <ArrowRight weight="bold" /></button>
      </div>
      <div className="split" style={{ alignItems: 'center' }}>
        <motion.div className="panel pad stack" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
          <Seg id="kind" options={['classic', 'blind'] as AuctionKind[]} value={kind} onChange={setKind} label={(k) => (k === 'classic' ? 'Classic auction' : 'Blind auction')} />
          <p className="dim">{kind === 'classic' ? 'You see who is up for auction, then bid openly.' : 'Every lot is a mystery player. Whoever wins him finds out who he is.'}</p>
          <Seg id="size" options={[5, 7] as (5 | 7)[]} value={size} onChange={setSize} label={(s) => `${s}-a-side`} />
          <p className="dim">
            {size === 5 ? '1 keeper, 1 defender, 2 midfielders, 1 attacker.' : '1 keeper, 2 defenders, 3 midfielders, 1 attacker.'}
          </p>
          <p>Everyone starts with <b className="accent num">£{budgetFor(size)}M</b>. Bids are open and rising: raise or drop out, last bidder standing wins. Lots can be any position.</p>
          <p className="small dim">If nobody bids, the player is gone. When only one team still needs players, they get the rest for free.</p>
        </motion.div>
        <div className="panel pad">
          <Pitch team={newTeam('Preview', `${size}-a-side`, SMALL_SIDED[size])} footer={false} compact />
        </div>
      </div>
    </div>
  )
}
