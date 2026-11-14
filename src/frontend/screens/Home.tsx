import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight } from '@phosphor-icons/react'
import { PLAYERS, type Player } from '../../game/data/players'
import Pitch from '../components/Pitch'
import PlayerCard from '../components/PlayerCard'
import { newTeam } from '../../game/engine/draft'

const byName = (n: string) => PLAYERS.find((p) => p.name === n) as Player
// A sample all-time XI for the hero pitch (4-3-3 slot order).
const SHOWCASE = newTeam('Showcase', '4-3-3')
SHOWCASE.picks = [
  'Lev Yashin', 'Paolo Maldini', 'Franz Beckenbauer', 'Franco Baresi', 'Cafu',
  'Zinedine Zidane', 'Lothar Matthäus', 'Andrés Iniesta', 'Ronaldinho', 'Pelé', 'Lionel Messi',
].map(byName)

const REEL = [...PLAYERS].sort((a, b) => b.ovr - a.ovr).filter((_, i) => i % 3 === 0).slice(0, 24)

const STEPS = [
  ['Spin', 'A wheel decides who picks first. After that the order snakes back and forth.'],
  ['Draft', 'Eleven rounds, one slot each. Once a player is taken, nobody else can have him.'],
  ['Set up', 'Pick a build-up style, a defensive approach, width, line height and a role for every player.'],
  ['Kick off', 'The match plays out in thirty seconds. Extra time and penalties if it comes to that.'],
]

const rise = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } }

export default function Home({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion()
  const float = (d: number) => (reduce ? {} : { y: [0, -14, 0], transition: { duration: 6, delay: d, repeat: Infinity, ease: 'easeInOut' as const } })

  return (
    <>
      <section className="hero">
        <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.09, delayChildren: 0.1 }}>
          <motion.h1 variants={rise} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            Your all-time XI.<br /><em>Nobody else's.</em>
          </motion.h1>
          <motion.p className="lede" variants={rise} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            Draft legends and current stars with friends, no duplicates allowed. Then the match decides who was right.
          </motion.p>
          <motion.div className="ctas" variants={rise} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <button className="btn primary lg" onClick={onStart}>Start a draft <ArrowRight weight="bold" /></button>
            <a className="btn ghost lg" href="#how">How it works</a>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-stage"
          initial={{ opacity: 0, rotateX: 40, y: 60 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ width: 'min(100%, 460px)', margin: '40px auto 0' }}>
            <Pitch team={SHOWCASE} angle={42} footer={false} />
          </div>
          <motion.div className="float-card l" style={{ position: 'absolute', left: 0, top: '8%', rotate: -8 }} animate={float(0)}>
            <PlayerCard p={byName('Diego Maradona')} />
          </motion.div>
          <motion.div className="float-card r" style={{ position: 'absolute', right: 0, bottom: '6%', rotate: 7 }} animate={float(1.5)}>
            <PlayerCard p={byName('Cristiano Ronaldo')} />
          </motion.div>
        </motion.div>
      </section>

      <section className="how" id="how">
        <h2>Four steps from argument to answer.</h2>
        <ol>
          {STEPS.map(([title, body], i) => (
            <motion.li
              key={title}
              className="panel"
              initial={reduce ? false : { opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <strong>{title}</strong>
              <p className="dim">{body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section>
        <h2 style={{ maxWidth: '16ch' }}>{PLAYERS.length} players, rated at their peak.</h2>
        <div className="reel">
          <div className="reel-track">
            {[...REEL, ...REEL].map((p, i) => <PlayerCard key={i} p={p} tilt={false} />)}
          </div>
        </div>
      </section>

      <section className="closer">
        <h2>Two to four friends. One device. Pass it round.</h2>
        <button className="btn primary lg" onClick={onStart}>Start a draft <ArrowRight weight="bold" /></button>
      </section>
    </>
  )
}
