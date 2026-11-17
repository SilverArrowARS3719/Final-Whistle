import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Copy, Crown, Flame, Play, Plus, ShareNetwork, SignOut, Trophy, UserPlus } from '@phosphor-icons/react'
import type { Account } from '../../backend/auth'
import type { Person } from '../../backend/social'
import { addToSeason, createSeason, currentSeason, daysLeft, joinSeason, leagueHonours, leaveSeason, mySeasons, seasonEnds, seasonTable, type Honour, type Season, type SeasonRow } from '../../backend/seasons'
import Seg from '../components/Seg'
import { SkeletonRows } from '../components/Skeleton'

type Props = { me: Account; friends: Person[]; onPlay: (memberIds: string[], mode: string) => Promise<void> }
const MODES: [string, string][] = [['xi', 'All-Time XI'], ['sot', 'Stick or Twist'], ['chaos', 'Chaos Draft'], ['auction', 'Auction'], ['winners', 'Team of Winners']]

export default function Seasons({ me, friends, onPlay }: Props) {
  const [list, setList] = useState<Season[] | null>(null)
  const [open, setOpen] = useState<Season | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [name, setName] = useState('')
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

  if (open) return <SeasonTable season={open} me={me} friends={friends} onPlay={onPlay} onBack={() => { setOpen(null); load() }} />

  return (
    <div className="seasons-page">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <h2>Leagues</h2>
          <span className="dim">Your group of mates, like a mini-league. Anyone with the code can join, friends or not. A season lasts a year: play as many games as you like, and whoever wins the most is champion. Then the next season starts.</span>
        </div>
      </div>
      {msg && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{msg.text}</p>}

      <div className="friends-grid">
        <div className="stack">
          <form className="panel pad stack" onSubmit={(e) => { e.preventDefault(); act(() => createSeason(name)) }}>
            <h3>Start a league</h3>
            <label className="field">
              <span className="label">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Sunday League" />
            </label>
            <button className="btn primary" disabled={busy || !name.trim()} aria-busy={busy}><Plus weight="bold" /> Create league</button>
          </form>
          <form className="panel pad stack" onSubmit={(e) => { e.preventDefault(); act(() => joinSeason(code)) }}>
            <h3>Join with a league code</h3>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="num code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" aria-label="League code" />
              <button className="btn primary" disabled={busy || code.trim().length !== 6}>Join <ArrowRight weight="bold" /></button>
            </div>
          </form>
          <div className="panel pad stack">
            <h3>How a season works</h3>
            <p className="small dim">Each season runs for one year from the day the league started. Any online game where at least two members play counts. Most wins at the end of the year takes the title; ties go to points (3 for a win, 1 for playing), then fewer games. Champions are kept forever on the league's honours board.</p>
          </div>
        </div>

        <div className="panel pad stack">
          <h3>Your leagues</h3>
          {list === null && <SkeletonRows rows={2} label="Loading leagues" />}
          {list?.length === 0 && <p className="small dim">No leagues yet. Start one and send the code to your mates, or join one with a code someone sent you.</p>}
          {list?.map((s, i) => {
            const left = daysLeft(s)
            return (
              <motion.button key={s.id} className="season-row" onClick={() => setOpen(s)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <span className="stack" style={{ gap: 2 }}>
                  <b>{s.name}</b>
                  <span className="small dim">{s.members} player{s.members === 1 ? '' : 's'} · Season {currentSeason(s)} · {left} day{left === 1 ? '' : 's'} left</span>
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

function SeasonTable({ season, me, friends, onBack, onPlay }: { season: Season; me: Account; friends: Person[]; onBack: () => void; onPlay: Props['onPlay'] }) {
  const [mode, setMode] = useState('xi')
  const [starting, setStarting] = useState(false)
  const now = currentSeason(season)
  const [shown, setShown] = useState(now)
  const [honours, setHonours] = useState<Honour[]>([])
  const [rows, setRows] = useState<SeasonRow[] | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  const load = useCallback(() => { setRows(null); seasonTable(season.id, shown).then(setRows).catch((e) => setError(e.message)) }, [season.id, shown])
  useEffect(() => { load() }, [load])
  useEffect(() => { leagueHonours(season.id).then(setHonours).catch(() => {}) }, [season.id])

  const left = daysLeft(season)
  const finished = shown < now // looking at a past season
  const leader = rows?.[0]
  const notIn = friends.filter((f) => !rows?.some((r) => r.user_id === f.id))
  const copy = async () => {
    try { await navigator.clipboard.writeText(season.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* code is on screen */ }
  }
  const invite = `Join my league "${season.name}" on The Final Whistle. Code: ${season.code}`
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: season.name, text: invite })
      else { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    } catch { /* share sheet closed */ }
  }
  const play = async () => {
    setStarting(true)
    try { await onPlay((rows ?? []).map((r) => r.user_id).filter((id) => id !== me.id), mode) } catch (e) { setError((e as Error).message); setStarting(false) }
  }
  const add = async (id: string) => {
    try { await addToSeason(season.id, id); setAdded([...added, id]); load() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="seasons-page">
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={onBack}><ArrowLeft weight="bold" /> All leagues</button>
          <h2>{season.name}</h2>
          <span className="dim">
            {finished
              ? leader && leader.played > 0 ? <>Season {shown} is over. <b className="accent">@{leader.username}</b> won it with {leader.wins} win{leader.wins === 1 ? '' : 's'}.</> : `Season ${shown} is over. Nobody played.`
              : <>Season {now} · {left} day{left === 1 ? '' : 's'} left · ends {seasonEnds(season).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}. Most wins takes it.</>}
          </span>
        </div>
        <button className="season-code num" onClick={copy} aria-label={`Copy league code ${season.code}`}>
          <span className="label">{copied ? 'Copied' : 'League code'}</span>
          <b>{season.code}</b>
          <Copy weight="bold" />
        </button>
      </div>
      {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}

      {!finished && (
        <div className="panel pad league-actions">
          <div className="stack" style={{ gap: 10 }}>
            <h3>Play a league game</h3>
            <p className="small dim">Starts an online game and invites everyone in the league. It counts on this table.</p>
            <Seg id="league-mode" options={MODES.map(([id]) => id)} value={mode} onChange={setMode} label={(m) => MODES.find(([id]) => id === m)![1]} />
          </div>
          <div className="row">
            <button className="btn primary lg" onClick={play} disabled={starting || !rows || rows.length < 2} aria-busy={starting}><Play weight="fill" /> Start and invite everyone</button>
            <button className="btn lg" onClick={share}><ShareNetwork weight="bold" /> Invite with the code</button>
          </div>
          {rows && rows.length < 2 && <p className="small dim">You're the only one here. Send the code to your mates first.</p>}
        </div>
      )}

      {now > 1 && <div style={{ marginBottom: 16 }}><Seg id="league-season" options={Array.from({ length: now }, (_, k) => now - k)} value={shown} onChange={setShown} label={(n) => (n === now ? `Season ${n} (now)` : `Season ${n}`)} /></div>}

      <div className="panel pad" style={{ overflowX: 'auto' }}>
        {rows === null ? <SkeletonRows label="Loading table" /> : (
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

      <div className="panel pad stack" style={{ marginTop: 16 }}>
        <h3><Trophy weight="fill" color="var(--amber)" /> Honours</h3>
        {honours.length === 0
          ? <p className="small dim">No champions yet. The first one is crowned when season 1 ends on {seasonEnds(season, 1).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          : honours.map((h) => <div key={h.season} className="person"><span>Season {h.season}: <b>@{h.username}</b></span><span className="small dim num">{h.wins} wins from {h.played}</span></div>)}
      </div>

      {!finished && (
        <div className="panel pad stack" style={{ marginTop: 16 }}>
          <h3>Add friends</h3>
          {notIn.length === 0 && <p className="small dim">All your friends are in. Anyone else can join with the code.</p>}
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
          <SignOut weight="bold" /> Leave league
        </button>
      </div>
    </div>
  )
}
