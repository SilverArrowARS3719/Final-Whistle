import { useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, Info } from '@phosphor-icons/react'
import Seg from '../components/Seg'
import { onlineReady } from '../../backend/supabase'
import { fetchAllEvents, localEvents, summarise, trackingOn, type Ev } from '../../backend/track'

const MODE_NAMES: Record<string, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction', winners: 'Team of Winners' }
const SCREEN_NAMES: Record<string, string> = {
  modes: 'Landing', home: 'Mode intro', setup: "Who's playing", spinner: 'Pick order', formation: 'Formation', size: 'Auction size', draft: 'Draft',
  handover: 'Hand-over', modedraft: 'Mode draft', done: 'Draft done', tactics: 'Tactics', match: 'Match', tournament: 'Tournament', career: 'Career',
  daily: 'Daily Draft', profile: 'Profile', login: 'Login', insights: 'Insights', landing: 'Landing',
}
const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)}%`)

type Source = 'Everyone' | 'This device'

/** For the owner: who plays, who comes back, where they give up. */
export default function Insights() {
  const [source, setSource] = useState<Source>(onlineReady ? 'Everyone' : 'This device')
  const [events, setEvents] = useState<Ev[] | null>(null)
  const [error, setError] = useState('')
  const load = () => {
    setEvents(null); setError('')
    if (source === 'This device') { setEvents(localEvents()); return }
    fetchAllEvents(30).then(setEvents).catch((e) => { setError((e as Error).message); setEvents(localEvents()) })
  }
  useEffect(load, [source]) // eslint-disable-line react-hooks/exhaustive-deps
  const s = useMemo(() => (events ? summarise(events) : null), [events])
  const peak = s ? Math.max(1, ...s.daily.map((d) => d.active)) : 1

  return (
    <div className="insights">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="label">Insights · last 30 days</span>
          <h2>Who plays, who comes back.</h2>
        </div>
        <div className="row">
          {onlineReady && <Seg id="ins-src" options={['Everyone', 'This device'] as Source[]} value={source} onChange={setSource} />}
          <button className="btn ghost sm" onClick={load} aria-label="Refresh"><ArrowsClockwise weight="bold" /></button>
        </div>
      </div>
      {!onlineReady && <p className="note small"><Info weight="bold" /> Online isn't set up, so this only shows this device. Once Supabase is connected (SETUP-ONLINE.md), every player's anonymous events land here.</p>}
      {error && <p className="note small" role="alert"><Info weight="bold" /> {error} Showing this device instead.</p>}
      {!trackingOn() && <p className="note small"><Info weight="bold" /> Tracking is switched off on this device (Settings, then Privacy).</p>}
      {!s ? <div className="skeleton-list"><span /><span /><span /></div> : (
        <>
          <div className="stat-grid">
            {[
              ['Players', s.players], ['Active today', s.today], ['Came back next day', pct(s.d1)],
              ['Came back after a week', pct(s.d7)], ['Avg session', `${s.avgMinutes.toFixed(1)} min`], ['Signed-in accounts', s.accounts],
            ].map(([k, v]) => <div key={k} className="panel pad stat"><span className="label">{k}</span><b className="num">{v}</b></div>)}
          </div>
          <div className="profile-cols">
            <section className="panel pad stack">
              <h3>Players per day</h3>
              <div className="bars" role="img" aria-label="Active players per day, last 14 days">
                {s.daily.map((d) => (
                  <div key={d.day} className="bar" title={`${d.day}: ${d.active} active, ${d.fresh} new`}>
                    <span className="num">{d.active || ''}</span>
                    <i style={{ height: `${(d.active / peak) * 100}%` }}><u style={{ height: d.active ? `${(d.fresh / d.active) * 100}%` : 0 }} /></i>
                    <em>{d.day.slice(8)}</em>
                  </div>
                ))}
              </div>
              <span className="small dim"><span className="key new" /> new players <span className="key" /> returning players</span>
            </section>
            <section className="panel pad stack">
              <h3>Where people leave</h3>
              <p className="small dim">The last screen of visits that ended without finishing a game or a Daily.</p>
              {s.dropOff.length === 0 ? <p className="small dim">Nothing yet.</p> : s.dropOff.map((d) => (
                <div key={d.screen} className="row" style={{ justifyContent: 'space-between' }}><span>{SCREEN_NAMES[d.screen] ?? d.screen}</span><b className="num">{d.sessions}</b></div>
              ))}
            </section>
          </div>
          <section className="panel pad stack" style={{ marginTop: 20 }}>
            <h3>Modes</h3>
            <table className="table mini-table">
              <thead><tr><th>Mode</th><th>Started</th><th>Finished</th><th>Finish rate</th></tr></thead>
              <tbody>
                {s.modes.length === 0 && <tr><td colSpan={4} className="dim">No games yet.</td></tr>}
                {s.modes.map((m) => (
                  <tr key={m.mode}><td>{MODE_NAMES[m.mode] ?? m.mode}</td><td className="num">{m.started}</td><td className="num">{m.finished}</td><td className="num">{m.started ? pct(m.finished / m.started) : '–'}</td></tr>
                ))}
                <tr><td>Daily Draft</td><td className="num" colSpan={2}>{s.dailyDraft.players} players</td><td className="num">avg {s.dailyDraft.avgPoints.toFixed(1)}/9</td></tr>
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}
