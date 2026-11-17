import { useState } from 'react'
import { usePersist } from '../../game/engine/persist'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { ArrowsClockwise, HandPalm, Warning } from '@phosphor-icons/react'
import { PLAYERS, type Player, surname } from '../../game/data/players'
import Pitch from '../components/Pitch'
import PlayerCard from '../components/PlayerCard'
import Ring, { useCountdown } from '../components/Ring'
import { SOT } from '../../game/engine/config'
import { drafterAt, slotsOf, type Team } from '../../game/engine/draft'
import { makeRng } from '../../game/engine/rng'
import { sfx } from '../../game/engine/sfx'
import { POOL_AVG, deal, teamTotal } from '../../game/engine/stickOrTwist'
import Handover from './Handover'
import { Turn, useCanAct } from '../online'

type Props = { teams: Team[]; order: number[]; onDone: (teams: Team[], gone: Set<number>) => void }
const rng = makeRng(Date.now())

export default function StickOrTwist({ teams: start, order, onDone }: Props) {
  const reduce = useReducedMotionConfig()
  const n = order.length
  const [teams, setTeams] = usePersist('sot:teams', start)
  const [pickNo, setPickNo] = usePersist('sot:pickNo', 0)
  const [twists, setTwists] = usePersist('sot:twists', start.map(() => SOT.twists))
  const [discards, setDiscards] = usePersist<Player[]>('sot:discards', [])
  const [passing, setPassing] = usePersist('sot:passing', true)
  const [dealt, setDealt] = usePersist<Player | null>('sot:dealt', null)

  const gone = new Set([...teams.flatMap((t) => t.picks.filter(Boolean).map((p) => p!.id)), ...discards.map((p) => p.id)])
  const pool = () => PLAYERS.filter((p) => !gone.has(p.id) && p.id !== dealt?.id)
  const ti = drafterAt(pickNo, order)
  const slot = Math.floor(pickNo / n)
  const team = teams[ti]
  const canAct = useCanAct(ti)
  const slotPos = slotsOf(team)[Math.min(slot, 10)].pos

  const begin = () => {
    setPassing(false)
    setDealt(deal(pool(), slotPos, rng))
    sfx.flip()
  }

  const stick = () => {
    if (!dealt) return
    const next = teams.map((t, i) => (i === ti ? { ...t, picks: t.picks.map((x, j) => (j === slot ? dealt : x)) } : t))
    setTeams(next)
    setDealt(null)
    if (pickNo + 1 === n * 11) return onDone(next, new Set([...gone, dealt.id]))
    setPickNo(pickNo + 1)
    setPassing(true)
  }

  const twist = () => {
    if (!dealt || twists[ti] === 0) return
    const thrown = dealt
    setDiscards([thrown, ...discards])
    const leftAfter = twists[ti] - 1
    setTwists(twists.map((t, i) => (i === ti ? leftAfter : t)))
    if (leftAfter === 2) setWarn('two')
    if (leftAfter === 0) setWarn('none')
    setDealt(deal(pool().filter((p) => p.id !== thrown.id), slotPos, rng))
    sfx.flip()
  }

  const [warn, setWarn] = useState<'two' | 'none' | null>(null)
  const left = useCountdown(SOT.decisionSeconds, () => canAct && stick(), `${pickNo}-${dealt?.id}-${passing}`, warn !== null)

  if (passing) {
    const prev = pickNo > 0 ? teams[drafterAt(pickNo - 1, order)] : null
    const prevSlot = Math.floor((pickNo - 1) / n)
    const last = prev?.picks[prevSlot] ?? undefined
    return (
      <Handover
        name={team.name}
        lastTeam={prev?.name}
        lastPick={last}
        lastOvr={last?.ovr}
        lastPos={prev ? slotsOf(prev)[prevSlot].pos : undefined}
        nextPos={slotPos}
        hint={<>You'll be dealt a <b className="accent">{slotPos}</b>. Stick or twist within {SOT.decisionSeconds} seconds.</>}
        pickNo={pickNo}
        total={n * 11}
        onReady={begin}
      />
    )
  }

  const total = teamTotal(team)
  const filled = team.picks.filter(Boolean).length
  const avg = filled ? total / filled : 0
  const slotsLeft = 11 - slot
  // how this deal compares with a typical player: the whole decision in one line
  const vsAvg = dealt ? dealt.ovr - POOL_AVG : 0
  const read = !dealt ? '' : vsAvg >= 6 ? 'A star. Most twists would land you someone worse.' : vsAvg >= 1 ? 'Above average. Twisting is a gamble.' : vsAvg >= -3 ? 'About average. Worth a twist if you have them to spare.' : 'Below average. A twist will usually beat him.'

  return (
    <Turn seat={ti}>
    <div className="stack" style={{ gap: 18 }}>
      <div className="panel draft-bar">
        <Ring left={left} total={SOT.decisionSeconds} />
        <div>
          <div className="label">Round {slot + 1} of 11</div>
          <h2>{team.name}: your {slotPos}</h2>
        </div>
        <div className="order-strip">
          {teams.map((t, i) => (
            <span key={i} className={i === ti ? 'on' : ''}>{t.name} <b className="num">{teamTotal(t)}</b> · {twists[i]}↻</span>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {warn && (
          <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="alertdialog" aria-modal="true" aria-labelledby="twist-warn" className="panel modal" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
              <Warning size={40} weight="fill" color="var(--amber)" />
              <h2 id="twist-warn">{warn === 'two' ? 'Two twists left' : 'No twists left'}</h2>
              <p className="dim">{warn === 'two' ? 'Be careful: you have 2 twists for the rest of the draft. Save them for the slots that matter.' : 'From now on you have to stick with every player you are dealt.'}</p>
              <button className="btn primary lg" onClick={() => setWarn(null)} autoFocus>Got it</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="split">
        <div className="panel pad sot-table">
          <AnimatePresence mode="popLayout">
            {dealt && (
              <motion.div
                key={dealt.id}
                className="sot-card"
                initial={reduce ? false : { rotateY: 180, y: -40, scale: 0.8, opacity: 0 }}
                animate={{ rotateY: 0, y: 0, scale: 1, opacity: 1 }}
                exit={{ x: -260, rotate: -25, opacity: 0, transition: { duration: 0.35 } }}
                transition={{ type: 'spring', stiffness: 120, damping: 15 }}
              >
                <PlayerCard p={dealt} />
              </motion.div>
            )}
          </AnimatePresence>
          {dealt && <p className="sot-read" role="status"><b className="num">{dealt.ovr}</b> {read}</p>}
          <div className="sot-actions">
            <button className="btn primary lg" onClick={stick}><HandPalm weight="fill" /> Stick</button>
            <button className="btn glass lg" onClick={twist} disabled={twists[ti] === 0}>
              <ArrowsClockwise weight="bold" /> Twist <span className="num">({twists[ti]} left)</span>
            </button>
          </div>
          {discards.length > 0 && (
            <div className="discards">
              <span className="label">Discard pile</span>
              <div className="discard-strip">
                {discards.slice(0, 18).map((p) => <span key={p.id} className="num">{p.ovr} {surname(p.name)}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="panel pad sot-info">
            <div className="sot-total">
              <span className="display num">{avg ? avg.toFixed(1) : '–'}</span>
              <span className="dim">team average</span>
            </div>
            <div className="sot-grid">
              <div><span className="label">Team total</span><b className="num">{total}</b></div>
              <div><span className="label">Slots left</span><b className="num">{slotsLeft}</b></div>
              <div><span className="label">Twists left</span><b className="num">{twists[ti]}</b></div>
              <div><span className="label">Twists per slot</span><b className="num">{(twists[ti] / slotsLeft).toFixed(1)}</b></div>
            </div>
            <p className="small dim">Spend twists where a bad deal hurts most. Once they're gone you keep whoever comes.</p>
          </div>
          <div className="panel pad">
            <Pitch team={team} active={slot} compact />
          </div>
        </div>
      </div>
    </div>
    </Turn>
  )
}
