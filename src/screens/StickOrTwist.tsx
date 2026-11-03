import { useMemo, useState } from 'react'
import { usePersist } from '../engine/persist'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowsClockwise, HandPalm, Sparkle, Warning } from '@phosphor-icons/react'
import { PLAYERS, type Player } from '../data/players'
import Pitch from '../components/Pitch'
import PlayerCard from '../components/PlayerCard'
import Ring, { useCountdown } from '../components/Ring'
import { SOT } from '../engine/config'
import { drafterAt, slotsOf, type Team } from '../engine/draft'
import { makeRng } from '../engine/rng'
import { sfx } from '../engine/sfx'
import { POOL_AVG, deal, neededPerSlot, settle, teamCap, teamTotal, type Verdict } from '../engine/stickOrTwist'
import Handover from './Handover'
import { HostOnly, Turn, useCanAct } from '../online/context'

type Props = { teams: Team[]; order: number[]; onDone: (teams: Team[], gone: Set<number>) => void }
const ease = [0.16, 1, 0.3, 1] as const
const rng = makeRng(Date.now())

export default function StickOrTwist({ teams: start, order, onDone }: Props) {
  const reduce = useReducedMotion()
  const n = order.length
  const cap = useMemo(() => teamCap(), [])
  const [teams, setTeams] = usePersist('sot:teams', start)
  const [pickNo, setPickNo] = usePersist('sot:pickNo', 0)
  const [twists, setTwists] = usePersist('sot:twists', start.map(() => SOT.twists))
  const [discards, setDiscards] = usePersist<Player[]>('sot:discards', [])
  const [passing, setPassing] = usePersist('sot:passing', true)
  const [dealt, setDealt] = usePersist<Player | null>('sot:dealt', null)
  const [results, setResults] = usePersist<{ team: Team; verdict: Verdict }[] | null>('sot:results', null)

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
    if (pickNo + 1 === n * 11) return finish(next)
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

  const finish = (final: Team[]) => {
    let available = PLAYERS.filter((p) => !gone.has(p.id) && !final.some((t) => t.picks.includes(p)))
    const out = final.map((t) => {
      const r = settle(t, available, cap, rng)
      available = available.filter((p) => !r.used.includes(p))
      return { team: r.team, verdict: r.verdict }
    })
    setResults(out)
  }

  const [warn, setWarn] = useState<'two' | 'none' | null>(null)
  const left = useCountdown(SOT.decisionSeconds, () => canAct && stick(), `${pickNo}-${dealt?.id}-${passing}`, warn !== null)

  if (results) return <Reveal results={results} cap={cap} onContinue={() => onDone(results.map((r) => r.team), new Set([...gone]))} />

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
  const slotsLeft = 11 - slot
  const room = cap - total
  const need = neededPerSlot(total, cap, slotsLeft)
  const danger = need >= POOL_AVG + 1 ? 'safe' : need >= POOL_AVG - 1 ? 'tight' : 'danger'
  const afterStick = total + (dealt?.ovr ?? 0)

  return (
    <Turn seat={ti}>
    <div className="stack" style={{ gap: 18 }}>
      <div className="panel draft-bar">
        <Ring left={left} total={SOT.decisionSeconds} />
        <div>
          <div className="label">Round {slot + 1} of 11 · cap {cap}</div>
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
          <p className="dim small" style={{ textAlign: 'center' }}>
            Stick and your total becomes <b className={`num ${afterStick > cap ? '' : 'accent'}`} style={afterStick > cap ? { color: 'var(--hot)' } : undefined}>{afterStick}</b> / {cap}
          </p>
          {(() => {
            const needAfter = neededPerSlot(afterStick, cap, slotsLeft - 1)
            const msg = afterStick > cap ? `Careful: sticking puts you ${afterStick - cap} over the cap right now.`
              : slotsLeft > 1 && needAfter < POOL_AVG - 2 ? `Careful: after this you can only afford about ${needAfter.toFixed(0)} per remaining slot. Most deals are higher.`
              : null
            return msg && <p className="sot-warning" role="status"><Warning weight="fill" /> {msg}</p>
          })()}
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
                {discards.slice(0, 18).map((p) => <span key={p.id} className="num">{p.ovr} {p.name.split(' ').slice(-1)[0]}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="stack">
          <div className="panel pad sot-info">
            <div className="sot-total">
              <span className="display num">{total}</span>
              <span className="dim">/ {cap}</span>
            </div>
            <div className={`meter ${danger}`} aria-label={`Bust risk: ${danger}`}>
              <motion.span animate={{ width: `${Math.min(100, (total / cap) * 100)}%` }} transition={{ duration: 0.5, ease }} />
            </div>
            <div className="sot-grid">
              <div><span className="label">Room left</span><b className="num">{room}</b></div>
              <div><span className="label">Slots left</span><b className="num">{slotsLeft}</b></div>
              <div><span className="label">Avg needed</span><b className="num">{need.toFixed(1)}</b></div>
              <div><span className="label">Twists</span><b className="num">{twists[ti]}</b></div>
            </div>
            <p className={`small meter-label ${danger}`}>
              {danger === 'safe' ? 'Comfortably under the cap.' : danger === 'tight' ? 'Getting tight. Average deals will leave you right on the cap.' : 'Bust likely. Twist for cheaper players or stick with low ones.'}
            </p>
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

function Reveal({ results, cap, onContinue }: { results: { team: Team; verdict: Verdict }[]; cap: number; onContinue: () => void }) {
  const [i, setI] = useState(0)
  const r = results[i]
  const last = i === results.length - 1

  return (
    <div className="sot-reveal">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          className={`panel verdict ${r.verdict.kind}`}
          initial={{ opacity: 0, scale: 0.85, rotateX: 30 }}
          animate={r.verdict.kind === 'bust' ? { opacity: 1, scale: 1, rotateX: 0, x: [0, -14, 12, -8, 6, 0] } : { opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease }}
          onAnimationStart={() => (r.verdict.kind === 'bust' ? sfx.bust() : r.verdict.kind === 'perfect' ? sfx.perfect() : undefined)}
          style={{ transformPerspective: 1200 }}
        >
          <span className="label">{r.team.name}</span>
          <div className="verdict-total num">{r.verdict.total} <span className="dim">/ {cap}</span></div>
          {r.verdict.kind === 'bust' && (
            <>
              <motion.h2 className="verdict-word" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 12 }}>
                <Warning weight="fill" /> Bust
              </motion.h2>
              <p className="dim">Over the cap by {r.verdict.total - cap}. Your best players get swapped for sub-75s until you're back under:</p>
              <div className="swaps">
                {r.verdict.swaps.map((s, k) => (
                  <motion.div key={k} className="swap" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + k * 0.15 }}>
                    <span className="out">{s.out.name} <b className="num">{s.out.ovr}</b></span>
                    <ArrowRight />
                    <span>{s.in.name} <b className="num">{s.in.ovr}</b></span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
          {r.verdict.kind === 'perfect' && (
            <>
              <motion.h2 className="verdict-word" initial={{ scale: 0.3, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 180, damping: 10 }}>
                <Sparkle weight="fill" /> Perfect XI
              </motion.h2>
              <p>Within 5 of the cap. Every player gets <b className="accent">+2 OVR</b> in the match.</p>
            </>
          )}
          {r.verdict.kind === 'safe' && <h2 className="verdict-word">Under the cap</h2>}
          {last ? (
            <HostOnly><button className="btn primary lg" style={{ marginTop: 24 }} onClick={onContinue}>See the squads <ArrowRight weight="bold" /></button></HostOnly>
          ) : (
            <button className="btn primary lg" style={{ marginTop: 24 }} onClick={() => setI(i + 1)}>Next: {results[i + 1].team.name} <ArrowRight weight="bold" /></button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
