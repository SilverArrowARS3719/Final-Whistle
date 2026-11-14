import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Player, Pos } from '../../game/data/players'
import PlayerCard from '../components/PlayerCard'
import { useAutoReady, useOnline } from '../online'
import { ArrowRight } from '@phosphor-icons/react'

type Props = {
  name: string
  lastTeam?: string
  lastPick?: Player // omitted when there is nothing to show (first turn, sealed bids)
  lastOvr?: number
  lastPos?: Pos
  nextPos: string
  hint?: ReactNode // replaces the 'next slot' sentence
  pickNo: number // picks made so far
  total: number
  onReady: () => void
  seat?: number // whose turn it is; defaults to looking the name up (team names = player names, except Team of Winners clubs)
}

const ease = [0.16, 1, 0.3, 1] as const

export default function Handover({ name, lastTeam, lastPick, lastOvr, lastPos, nextPos, hint, pickNo, total, onReady, seat: seatProp }: Props) {
  const reduce = useReducedMotion()
  const pct = (pickNo / total) * 100
  const o = useOnline()
  const seat = seatProp ?? o.names.indexOf(name)
  // online there's no device to pass: the player's own device skips straight on, everyone else waits
  if (useAutoReady(seat, onReady))
    return (
      <div className="handover">
        <div className="handover-grid solo">
          <div className="handover-next">
            <span className="label">Up next</span>
            <h2 className="handover-name">{name}</h2>
            <p className="dim">{seat === o.mySeat ? 'Your turn.' : `Waiting for ${name}…`}</p>
          </div>
        </div>
      </div>
    )

  return (
    <div className="handover">
      <div className="handover-glow" aria-hidden />
      <div className={`handover-grid ${lastPick ? '' : 'solo'}`}>
        {lastPick && lastOvr !== undefined && (
        <div className="handover-pick">
          <motion.div
            className="label"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            {lastTeam === name ? 'You took' : `${lastTeam} took`}
          </motion.div>
          <motion.div
            className="handover-card"
            initial={reduce ? false : { rotateY: -200, scale: 0.6, y: 40, opacity: 0 }}
            animate={{ rotateY: 0, scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 70, damping: 13, delay: 0.1 }}
          >
            <PlayerCard p={lastPick} ovr={lastOvr} />
          </motion.div>
          <motion.div className="small dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            as {lastPos}{lastOvr < lastPick.ovr && ` (${lastPick.ovr} out of position, now ${lastOvr})`}
          </motion.div>
        </div>

        )}
        <div className="handover-next">
          <motion.span className="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            {lastTeam === name ? 'Snake order: you pick again' : 'Pass the device to'}
          </motion.span>
          <h2 className="handover-name" aria-label={name}>
            {[...name].map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={reduce ? false : { y: '110%', rotateX: -80, opacity: 0 }}
                animate={{ y: 0, rotateX: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.45 + i * 0.045, ease }}
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </h2>
          <motion.div className="stack" style={{ gap: 18 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6, ease }}>
            <p className="dim">{hint ?? <>Your next slot is <b className="accent">{nextPos}</b>. The clock starts when you tap.</>}</p>
            <div className="progress">
              <div className="row small dim" style={{ justifyContent: 'space-between' }}>
                <span>Draft progress</span>
                <span className="num">{pickNo} / {total}</span>
              </div>
              <div className="track"><motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.9, duration: 0.8, ease }} /></div>
            </div>
            <div>
              <button className="btn glass lg" onClick={onReady} autoFocus>
                I'm {name}, let's go <ArrowRight weight="bold" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
