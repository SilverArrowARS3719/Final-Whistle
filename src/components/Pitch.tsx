import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { chemBoosts } from '../engine/chemistry'
import { doubledIds, slotsOf, type Perk, type Team } from '../engine/draft'
import { effectiveOvr } from '../engine/position'

type Props = { team: Team; active?: number; angle?: number; interactive?: boolean; footer?: boolean; compact?: boolean }

const surname = (n: string) => n.split(' ').slice(-1)[0]

// Chaos card perks shown on the chip.
function Badges({ perk, shielded }: { perk?: Perk; shielded?: boolean }) {
  const list = [perk?.captain && ['C', 'Captain: +3'], perk?.doubleLink && ['x2', 'Double Link'], perk?.hotHead && ['!', 'Hot Head'], perk?.bigGame && ['ET', 'Big Game Player'], shielded && ['S', 'Shielded']]
    .filter(Boolean) as [string, string][]
  if (!list.length) return null
  return <div className="perks">{list.map(([b, t]) => <span key={b} title={t}>{b}</span>)}</div>
}

// A pitch tilted back in 3D; player chips stand upright on it. Pointer movement swings the camera.
export default function Pitch({ team, active, angle: a, interactive = true, footer = true, compact = false }: Props) {
  const angle = a ?? (compact ? 20 : 34)
  const reduce = useReducedMotion()
  const slots = slotsOf(team)
  const chem = chemBoosts(team.picks, doubledIds(team))
  const total = chem.reduce((a, b) => a + b, 0)

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [angle + 6, angle - 6]), { stiffness: 120, damping: 20 })
  const rotateZ = useSpring(useTransform(px, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 20 })
  const counterX = useTransform(rotateX, (v) => -v)
  const counterZ = useTransform(rotateZ, (v) => -v)
  const live = interactive && !reduce

  return (
    <div>
      <div
        className={`pitch-3d ${compact ? 'compact' : ''}`}
        onPointerMove={live ? (e) => {
          const r = e.currentTarget.getBoundingClientRect()
          px.set((e.clientX - r.left) / r.width - 0.5)
          py.set((e.clientY - r.top) / r.height - 0.5)
        } : undefined}
        onPointerLeave={live ? () => { px.set(0); py.set(0) } : undefined}
      >
        <motion.div className="pitch-plane" style={{ rotateX, rotateZ }}>
          <div className="mid" />
          <div className="circle" />
          {slots.map((s, i) => {
            const p = team.picks[i]
            return (
              <motion.div
                key={i}
                className={`chip ${p ? 'filled' : ''} ${i === active ? 'active' : ''}`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, rotateX: counterX, rotateZ: counterZ, z: 24 }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={p?.id ?? 'empty'}
                    className="disc"
                    initial={{ scale: 0.2, y: -60, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    {p ? effectiveOvr(p, s.pos) + chem[i] : s.pos}
                  </motion.div>
                </AnimatePresence>
                {p ? (
                  <>
                    <div className="nm">{surname(p.name)}</div>
                    <div className="tag">{s.pos}{chem[i] > 0 && <span className="chem"> +{chem[i]}</span>}</div>
                    <Badges perk={team.perks?.[p.id]} shielded={team.shielded?.includes(p.id)} />
                  </>
                ) : (
                  i === active && <div className="tag accent">picking</div>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </div>
      {footer && (
        <div className="row small dim" style={{ justifyContent: 'space-between', marginTop: 18 }}>
          <span>{team.formation}</span>
          <span>Chemistry <b className="accent num">+{total}</b></span>
        </div>
      )}
    </div>
  )
}
