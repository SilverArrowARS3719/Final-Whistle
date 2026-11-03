import { motion } from 'motion/react'
import { ArrowRight, Trophy } from '@phosphor-icons/react'
import type { Team } from '../engine/draft'
import { champion, standings, type Fixture } from '../engine/tournament'
import { HostOnly } from '../online/context'

type Props = { teams: Team[]; fixtures: Fixture[]; onNext: () => void; onReset: () => void }

export default function Tournament({ teams, fixtures, onNext, onReset }: Props) {
  const n = teams.length
  const champ = champion(n, fixtures)
  const next = fixtures.find((f) => f.winner === undefined)
  const name = (i: number) => teams[i].name
  const final = fixtures.find((f) => f.stage === 'Final')

  if (champ !== null)
    return (
      <div className="champ">
        <motion.div
          initial={{ rotateY: 540, scale: 0.3, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'inline-block' }}
        >
          <Trophy size={120} weight="fill" color="var(--accent)" />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
          {name(champ)} built<br />the best XI.
        </motion.h2>
        <Results n={n} fixtures={fixtures} name={name} final={final} />
        <button className="btn primary lg" style={{ marginTop: 32 }} onClick={onReset}>Play again</button>
      </div>
    )

  return (
    <div>
      <div className="screen-head">
        <h2>{n === 3 ? 'Round robin' : n === 4 ? 'Knockout' : 'The decider'}</h2>
        {next && (
          <HostOnly note="Waiting for the host to start the next match">
            <button className="btn primary lg" onClick={onNext}>
              {next.stage}: {name(next.a)} v {name(next.b)} <ArrowRight weight="bold" />
            </button>
          </HostOnly>
        )}
      </div>
      <Results n={n} fixtures={fixtures} name={name} final={final} />
    </div>
  )
}

function Results({ n, fixtures, name, final }: { n: number; fixtures: Fixture[]; name: (i: number) => string; final?: Fixture }) {
  if (n === 4)
    return (
      <div className="bracket">
        <div className="stack">
          {fixtures.filter((f) => f.stage.startsWith('Semi')).map((f, i) => <Card key={f.stage} f={f} name={name} i={i} />)}
        </div>
        {final ? <Card f={final} name={name} i={2} /> : <div className="panel fixture dim">Final: the two semi-final winners</div>}
      </div>
    )
  return (
    <div className="stack">
      {n === 3 && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
            <tbody>
              {standings(n, fixtures).map((r, i) => (
                <motion.tr key={r.team} layout className={i === 0 && r.p > 0 ? 'lead' : ''}>
                  <td>{i + 1}</td><td>{name(r.team)}</td><td>{r.p}</td><td>{r.w}</td><td>{r.l}</td>
                  <td>{r.gf}</td><td>{r.ga}</td><td>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td><td><b>{r.pts}</b></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="formations">
        {fixtures.map((f, i) => <Card key={f.stage} f={f} name={name} i={i} />)}
      </div>
    </div>
  )
}

function Card({ f, name, i }: { f: Fixture; name: (i: number) => string; i: number }) {
  const cls = (t: number) => (f.winner === undefined ? '' : f.winner === t ? 'w' : 'l')
  return (
    <motion.div
      className="panel fixture"
      initial={{ opacity: 0, rotateX: -30, y: 20 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformPerspective: 900 }}
    >
      <span className="label">{f.stage}{f.pens ? ` · pens ${f.pens[0]}-${f.pens[1]}` : ''}</span>
      <div className={`side ${cls(f.a)}`}><span>{name(f.a)}</span><span className="sc">{f.score?.[0] ?? ''}</span></div>
      <div className={`side ${cls(f.b)}`}><span>{name(f.b)}</span><span className="sc">{f.score?.[1] ?? ''}</span></div>
    </motion.div>
  )
}
