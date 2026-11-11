import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowClockwise, ArrowLeft, ArrowRight, Play, Trophy } from '@phosphor-icons/react'
import Seg from '../components/Seg'
import ShareResult from '../components/ShareResult'
import { careerWinner, opponentTeam, simulateCareer, TROPHIES, TROPHY_NAME, trophiesOf, type SeasonResult, type Tie, type Trophy as TrophyId } from '../engine/career'
import { CAREER } from '../engine/config'
import type { Team } from '../engine/draft'
import { usePersist } from '../engine/persist'
import { simulateMatch } from '../engine/sim'
import type { ResultCard } from '../engine/shareCard'
import { HostOnly } from '../online/context'
import Match from './Match'

type Props = { teams: Team[]; kicker: string; onChampion: (seat: number) => void; onRematch: () => void; onReset: () => void; resetLabel: string }
type Watch = { who: number; season: number; tie: Tie }
const CUPS = [['shield', 'Community Shield'], ['super', 'UEFA Super Cup'], ['fa', 'FA Cup'], ['efl', 'Carabao Cup'], ['ucl', 'Champions League']] as const
const SHORT: Record<TrophyId, string> = { pl: 'PL', fa: 'FA', efl: 'EFL', shield: 'CS', ucl: 'UCL', super: 'USC' }

const score = (t: Tie) => `${t.score[0]}-${t.score[1]}${t.pens ? ` (${t.pens[0]}-${t.pens[1]} pens)` : ''}${t.aggregate ? ' agg' : ''}`

export default function Career({ teams, kicker, onChampion, onRematch, onReset, resetLabel }: Props) {
  // shared: every device rebuilds the identical careers from the seed
  const [seed] = usePersist('career:seed', () => Date.now() % 1_000_000)
  const [played, setPlayed] = usePersist('career:played', 0)
  const [tab, setTab] = useState(1)
  const [watch, setWatch] = useState<Watch | null>(null)
  const careers = useMemo(() => teams.map((t, i) => simulateCareer(t, seed + i * 104_729, CAREER.seasons)), [teams, seed])
  const shown = careers.map((c) => c.slice(0, played))
  const verdict = played ? careerWinner(shown, played) : null

  useEffect(() => { if (verdict) onChampion(verdict.winner) }, [verdict?.winner]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (played) setTab(played) }, [played])

  if (watch) {
    const club = teams[watch.who]
    const opp = opponentTeam(watch.tie.opp, watch.tie.oppOvr)
    const result = simulateMatch(club, opp, watch.tie.seed!)
    return (
      <div className="stack">
        <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={() => setWatch(null)}><ArrowLeft weight="bold" /> Back to the season</button>
        <Match result={result} teams={[club, opp]} seats={[watch.who, (watch.who + 1) % 4]} kicker={`${kicker} · Season ${watch.season} · ${watch.tie.round}`} onFinish={() => setWatch(null)} />
      </div>
    )
  }

  const card: ResultCard | null = verdict && {
    kicker: `${kicker} · ${verdict.how === 'set' ? `Full set in season ${verdict.season}` : `After ${played} seasons`}`,
    rows: teams.map((t, i) => ({ name: t.name, value: `${trophiesOf(shown[i]).length}`, win: i === verdict.winner })).sort((a, b) => Number(b.value) - Number(a.value)),
    lists: [{ title: 'Trophy cabinets', items: teams.map((t, i) => `${t.name}: ${trophiesOf(shown[i]).map((x) => SHORT[x]).join(', ') || 'nothing'}`) }],
    star: `${teams[verdict.winner].name} ${verdict.how === 'set' ? 'won everything' : 'won the most'}`,
  }

  return (
    <div className="career">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Team of Winners · {played === 0 ? 'Pre-season' : `Season ${played} of ${CAREER.seasons}`}</span>
          <h2>{verdict ? `${teams[verdict.winner].name} ${verdict.how === 'set' ? 'won everything.' : 'win the race.'}` : 'Six trophies. Three seasons.'}</h2>
          {!verdict && <span className="dim">First club to win all six at least once takes it. Nobody manages it? Most trophies wins.</span>}
        </div>
        {!verdict && (
          <HostOnly note="The host plays the next season">
            <button className="btn primary lg" onClick={() => setPlayed(played + 1)}><Play weight="fill" /> Play season {played + 1}</button>
          </HostOnly>
        )}
      </div>

      {verdict && card && (
        <motion.div className="champ-actions row" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ justifyContent: 'flex-start', marginTop: 0, marginBottom: 20 }}>
          <HostOnly note="Waiting for the host to start a rematch"><button className="btn primary lg" onClick={onRematch}><ArrowClockwise weight="bold" /> Rematch</button></HostOnly>
          <ShareResult card={card} />
          <button className="btn ghost" onClick={onReset}>{resetLabel}</button>
        </motion.div>
      )}

      <div className="race">
        {teams.map((t, i) => {
          const won = trophiesOf(shown[i])
          return (
            <motion.div key={i} className={`panel pad race-row ${verdict?.winner === i ? 'lead' : ''}`} layout>
              <div className="race-name"><b>{t.name}</b><span className="dim small">{won.length} troph{won.length === 1 ? 'y' : 'ies'}</span></div>
              <div className="cabinet">
                {TROPHIES.map((k) => {
                  const times = won.filter((x) => x === k).length
                  return (
                    <span key={k} className={`cup ${times ? 'on' : ''}`} title={TROPHY_NAME[k]}>
                      <Trophy weight={times ? 'fill' : 'regular'} />
                      <i>{SHORT[k]}</i>
                      {times > 1 && <em className="num">×{times}</em>}
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>

      {played > 0 && (
        <div className="stack" style={{ gap: 16, marginTop: 24 }}>
          {played > 1 && <Seg id="career-season" options={Array.from({ length: played }, (_, k) => k + 1)} value={tab} onChange={setTab} label={(s) => `Season ${s}`} />}
          <AnimatePresence mode="wait">
            <motion.div key={tab} className="formations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {teams.map((t, i) => <SeasonPanel key={i} club={t.name} s={careers[i][tab - 1]} onWatch={(tie) => setWatch({ who: i, season: tab, tie })} />)}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function SeasonPanel({ club, s, onWatch }: { club: string; s: SeasonResult; onWatch: (t: Tie) => void }) {
  const you = s.table.findIndex((r) => r.you)
  const rows = s.table.map((r, i) => [r, i] as const).filter(([, i]) => i < 5 || Math.abs(i - you) <= 1)
  return (
    <div className="panel pad stack season-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>{club}</h3>
        <span className="num dim small">Team rating {s.strength}</span>
      </div>
      {s.trophies.length > 0 && <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{s.trophies.map((k) => <span key={k} className="won-chip"><Trophy weight="fill" /> {TROPHY_NAME[k]}</span>)}</div>}
      <table className="table mini-table">
        <thead><tr><th>#</th><th>Premier League</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>
          {rows.map(([r, i]) => (
            <tr key={r.name} className={r.you ? 'lead' : ''}><td>{i + 1}</td><td>{r.name}</td><td>{r.p}</td><td>{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td><td><b>{r.pts}</b></td></tr>
          ))}
        </tbody>
      </table>
      {CUPS.map(([k, name]) => {
        const ties = s.cups[k]
        if (!ties) return null
        return (
          <div key={k} className="cup-path">
            <span className="label">{name}{k === 'ucl' && s.uclPhase ? ` · league phase ${s.uclPhase.pts} pts` : ''}</span>
            {ties.length === 0 && <span className="small dim">Out in the league phase.</span>}
            <div className="ties">
              {ties.map((t, j) => (
                <span key={j} className={`tie ${t.won ? 'w' : 'l'}`}>
                  <b>{t.round}</b> {t.won ? 'W' : 'L'} {score(t)} v {t.opp}
                  {t.seed !== undefined && <button className="btn ghost sm" onClick={() => onWatch(t)}><Play weight="fill" /> Watch</button>}
                </span>
              ))}
            </div>
          </div>
        )
      })}
      {!s.cups.ucl && <span className="small dim">No Champions League this season (finish top {CAREER.uclQualify} to qualify).</span>}
      <span className="small dim"><ArrowRight weight="bold" /> Finished {you + 1}{['st', 'nd', 'rd'][you] ?? 'th'} in the league.</span>
    </div>
  )
}
