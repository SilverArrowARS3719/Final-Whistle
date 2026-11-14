import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Copy, Crown, Flame, Plus, SignOut, UserPlus } from '@phosphor-icons/react'
import type { Account } from '../../backend/auth'
import type { Person } from '../../backend/social'
import { addToSeason, createSeason, daysLeft, joinSeason, leaveSeason, mySeasons, seasonTable, type Season, type SeasonRow } from '../../backend/seasons'
import Seg from '../components/Seg'

type Props = { me: Account; friends: Person[] }

export default function Seasons({ me, friends }: Props) {
  const [list, setList] = useState<Season[] | null>(null)
  const [open, setOpen] = useState<Season | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [name, setName] = useState('')
  const [weeks, setWeeks] = useState(4)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => mySeasons().then(setList).catch((e) => setMsg({ ok: false, text: e.message })), [])
  useEffect(() => { load() }, [load])

  const act = async (fn: () => Promise<Season | void>) => {
    setBusy(true)
    setMsg(null)
    try {
      const s = await fn()
      await load()
      if (s) setOpen(s)
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  if (open) return <SeasonTable season={open} me={me} friends={friends} onBack={() => { setOpen(null); load() }} />

  return (
    <div className="seasons-page">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <h2>Seasons</h2>
          <span className="dim">A league with your friends. Every online game you play together earns points.</span>
        </div>
      </div>
      {msg && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{msg.text}</p>}

      <div className="friends-grid">
        <div className="stack">
          <form className="panel pad stack" onSubmit={(e) => { e.preventDefault(); act(() => createSeason(name, weeks)) }}>
            <h3>Start a season</h3>
            <label className="field">
              <span className="label">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Sunday League" />
            </label>
            <div className="field">
              <span className="label">Length</span>
              <Seg id="season-weeks" options={[2, 4, 8, 12]} value={weeks} onChange={setWeeks} label={(w) => `${w} weeks`} />
            </div>
            <button className="btn primary" disabled={busy || !name.trim()}>{busy ? <span className="spin" aria-hidden /> : <Plus weight="bold" />} Create season</button>
          </form>
          <form className="panel pad stack" onSubmit={(e) => { e.preventDefault(); act(() => joinSeason(code)) }}>
            <h3>Join with a season code</h3>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="num code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" aria-label="Season code" />
              <button className="btn primary" disabled={busy || code.trim().length !== 6}>Join <ArrowRight weight="bold" /></button>
            </div>
          </form>
          <div className="panel pad stack">
            <h3>How points work</h3>
            <p className="small dim">Win the tournament: 3 points. Play and lose: 1 point. Games count when at least two members of the season played. A streak is wins in a row.</p>
          </div>
        </div>

        <div className="panel pad stack">
          <h3>Your seasons</h3>
          {list === null && <div className="skeleton-list" aria-busy="true" aria-label="Loading seasons"><i /><i /></div>}
          {list?.length === 0 && <p className="small dim">No seasons yet. Start one and share its code, or add friends to it.</p>}
          {list?.map((s, i) => {
            const left = daysLeft(s)
            return (
              <motion.button key={s.id} className="season-row" onClick={() => setOpen(s)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <span className="stack" style={{ gap: 2 }}>
                  <b>{s.name}</b>
                  <span className="small dim">{s.members} players · {left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'Finished'}</span>
                </span>
                <ArrowRight weight="bold" />
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SeasonTable({ season, me, friends, onBack }: { season: Season; me: Account; friends: Person[]; onBack: () => void }) {
  const [rows, setRows] = useState<SeasonRow[] | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  const load = useCallback(() => seasonTable(season.id).then(setRows).catch((e) => setError(e.message)), [season.id])
  useEffect(() => { load() }, [load])

  const left = daysLeft(season)
  const finished = left <= 0
  const leader = rows?.[0]
  const notIn = friends.filter((f) => !rows?.some((r) => r.user_id === f.id))
  const copy = async () => {
    try { await navigator.clipboard.writeText(season.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* code is on screen */ }
  }
  const add = async (id: string) => {
    try { await addToSeason(season.id, id); setAdded([...added, id]); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="seasons-page">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={onBack}><ArrowLeft weight="bold" /> All seasons</button>
          <h2>{season.name}</h2>
          <span className="dim">
            {finished
              ? leader && leader.played > 0 ? <>Finished. <b className="accent">@{leader.username}</b> won the season.</> : 'Finished.'
              : `${left} day${left === 1 ? '' : 's'} left · ends ${new Date(season.ends_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
          </span>
        </div>
        <button className="season-code num" onClick={copy} aria-label={`Copy season code ${season.code}`}>
          <span className="label">{copied ? 'Copied' : 'Season code'}</span>
          <b>{season.code}</b>
          <Copy weight="bold" />
        </button>
      </div>
      {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}

      <div className="panel pad" style={{ overflowX: 'auto' }}>
        {rows === null ? <div className="skeleton-list" aria-busy="true" aria-label="Loading table"><i /><i /><i /></div> : (
          <table className="table season-table">
            <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>Pts</th><th>Streak</th><th>Form</th><th title="Points in the last 7 days">7 days</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.user_id} layout className={`${i === 0 && r.played > 0 ? 'lead' : ''} ${r.user_id === me.id ? 'me' : ''}`}>
                  <td>{i === 0 && r.played > 0 ? <Crown weight="fill" color="var(--accent)" aria-label="Leader" /> : i + 1}</td>
                  <td>@{r.username}</td>
                  <td>{r.played}</td><td>{r.wins}</td><td>{r.played - r.wins}</td>
                  <td><b>{r.points}</b></td>
                  <td>{r.streak >= 2 ? <span className="streak"><Flame weight="fill" /> {r.streak}</span> : r.streak}<span className="dim small"> / best {r.best_streak}</span></td>
                  <td><span className="form" aria-label={`Form ${r.form || 'none'}`}>{r.form ? r.form.split('').map((c, k) => <i key={k} className={c === 'W' ? 'w' : 'l'}>{c}</i>) : <span className="dim">-</span>}</span></td>
                  <td>{r.week_points}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!finished && (
        <div className="panel pad stack" style={{ marginTop: 16 }}>
          <h3>Add friends</h3>
          {notIn.length === 0 && <p className="small dim">All your friends are in. Share the season code with anyone else.</p>}
          {notIn.map((f) => (
            <div key={f.id} className="person">
              <span>@{f.username}</span>
              <button className="btn ghost sm" disabled={added.includes(f.id)} onClick={() => add(f.id)}><UserPlus weight="bold" /> {added.includes(f.id) ? 'Added' : 'Add'}</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={async () => { if (confirm(`Leave ${season.name}? Your points stay in the history but you drop off the table.`)) { await leaveSeason(season.id).catch(() => {}); onBack() } }}>
          <SignOut weight="bold" /> Leave season
        </button>
      </div>
    </div>
  )
}
