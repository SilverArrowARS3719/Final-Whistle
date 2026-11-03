import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SoccerBall } from '@phosphor-icons/react'
import Pitch from '../components/Pitch'
import { HostOnly, Turn } from '../online/context'
import Seg from '../components/Seg'
import { slotsOf, type Team } from '../engine/draft'
import { BUILD_UPS, DEF_APPROACHES, FOCUS_LABEL, findRole, rolesFor, type Focus, type Tactics } from '../engine/tactics'

type Props = {
  teams: Team[]
  sides: [number, number]
  stage: string
  onChange: (team: number, t: Tactics) => void
  onKickOff: () => void
}

const HINTS = {
  buildUp: {
    Balanced: 'No strengths, no weaknesses.',
    'Short Passing': 'More of the ball and better chances. Strong against Deep, weak against Aggressive pressing.',
    Counter: 'Little possession but dangerous breaks. Punishes High and Aggressive, struggles against Deep.',
    'Long Ball': 'More chances, lower quality. Good against high lines, better with a Target Forward.',
  },
  defence: {
    Deep: 'Concede fewer and worse chances, but create less yourself.',
    Balanced: 'No strengths, no weaknesses.',
    High: 'Win the ball higher up the pitch. Exposed when someone gets in behind.',
    Aggressive: 'Press everywhere: more possession, more cards, tires faster, exposed to counters.',
  },
}

export default function TacticsScreen({ teams, sides, stage, onChange, onKickOff }: Props) {
  const [tab, setTab] = useState(0)
  const ti = sides[tab]
  const team = teams[ti]
  const t = team.tactics
  const slots = slotsOf(team)
  const set = (patch: Partial<Tactics>) => onChange(ti, { ...t, ...patch })
  const setRole = (i: number, patch: Partial<Tactics['roles'][number]>) =>
    set({ roles: t.roles.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  return (
    <div>
      <div className="screen-head">
        <div className="stack" style={{ gap: 10 }}>
          <span className="label">{stage}</span>
          <h2>{teams[sides[0]].name} v {teams[sides[1]].name}</h2>
        </div>
        <div className="row">
          <Seg id="tactics-team" options={[0, 1]} value={tab} onChange={setTab} label={(i) => teams[sides[i]].name} />
          <HostOnly note="The host kicks off"><button className="btn primary lg" onClick={onKickOff}><SoccerBall weight="fill" /> Kick off</button></HostOnly>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <Turn seat={ti} note={`Only ${team.name} can change these tactics`}>
        <motion.div
          key={ti}
          className="split"
          initial={{ opacity: 0, rotateY: tab ? 12 : -12, x: tab ? 40 : -40 }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          exit={{ opacity: 0, rotateY: tab ? -12 : 12 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1400 }}
        >
          <div className="panel pad stack" style={{ gap: 24 }}>
            <div className="tgrid">
              <div className="field">
                <span className="label">Build-up style</span>
                <select value={t.buildUp} onChange={(e) => set({ buildUp: e.target.value as Tactics['buildUp'] })}>
                  {BUILD_UPS.map((b) => <option key={b}>{b}</option>)}
                </select>
                <span className="hint">{HINTS.buildUp[t.buildUp]}</span>
              </div>
              <div className="field">
                <span className="label">Defensive approach</span>
                <select value={t.defence} onChange={(e) => set({ defence: e.target.value as Tactics['defence'] })}>
                  {DEF_APPROACHES.map((b) => <option key={b}>{b}</option>)}
                </select>
                <span className="hint">{HINTS.defence[t.defence]}</span>
              </div>
              <label className="field">
                <span className="label">Width <b className="num" style={{ color: 'var(--chalk)' }}>{t.width}</b></span>
                <input type="range" min={1} max={10} value={t.width} onChange={(e) => set({ width: Number(e.target.value) })} />
                <span className="hint">Wide creates more chances, but they are harder and the middle opens up.</span>
              </label>
              <label className="field">
                <span className="label">Line height <b className="num" style={{ color: 'var(--chalk)' }}>{t.line}</b></span>
                <input type="range" min={1} max={10} value={t.line} onChange={(e) => set({ line: Number(e.target.value) })} />
                <span className="hint">High squeezes slow build-up. Counter and Long Ball can get in behind it.</span>
              </label>
            </div>

            <div>
              <h3 style={{ marginBottom: 6 }}>Roles</h3>
              <p className="small dim">Focus + and ++ make a role's strengths and weaknesses 1.5x and 2x as strong.</p>
              <div className="roles">
                {slots.map((s, i) => {
                  const role = findRole(s.pos, t.roles[i].role)
                  return (
                    <div key={i} className="role-row" title={role.desc}>
                      <span className="p">{s.pos}</span>
                      <span className="n">{team.picks[i]?.name}</span>
                      <select aria-label={`${s.pos} role`} value={role.name} onChange={(e) => setRole(i, { role: e.target.value })}>
                        {rolesFor(s.pos).map((r) => <option key={r.name}>{r.name}</option>)}
                      </select>
                      <span className="focus" role="radiogroup" aria-label="Focus">
                        {FOCUS_LABEL.map((f, k) => (
                          <button key={k} className={t.roles[i].focus === k ? 'on' : ''} onClick={() => setRole(i, { focus: k as Focus })}>
                            {f || 'none'}
                          </button>
                        ))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="panel pad" style={{ position: 'sticky', top: 16 }}>
            <Pitch team={team} />
          </div>
        </motion.div>
        </Turn>
      </AnimatePresence>
    </div>
  )
}
