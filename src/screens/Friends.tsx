import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, MagnifyingGlass, Trophy, UserPlus, X } from '@phosphor-icons/react'
import type { Account } from '../online/auth'
import { acceptRequest, codeForInvite, dismissInvite, removeFriendship, searchUsers, sendFriendRequest, type Person, type useSocial } from '../online/social'

type Props = { me: Account; social: ReturnType<typeof useSocial>; onJoin: (code: string) => Promise<void> }

export default function Friends({ me, social, onJoin }: Props) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Person[]>([])
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const { friends, incoming, outgoing, invites, board } = social

  useEffect(() => {
    const id = setTimeout(() => searchUsers(q, me.id).then(setFound), 200) // debounce typing
    return () => clearTimeout(id)
  }, [q, me.id])

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setMsg(null)
    try {
      await fn()
      if (ok) setMsg({ ok: true, text: ok })
      social.refresh()
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    }
  }
  const relation = (id: string) =>
    friends.some((f) => f.id === id) ? 'Friends' : outgoing.some((f) => f.addressee.id === id) ? 'Requested' : incoming.some((f) => f.requester.id === id) ? 'Wants to be friends' : null

  return (
    <div className="friends-page">
      <div className="screen-head">
        <h2>Friends</h2>
        <span className="dim">Signed in as <b style={{ color: 'var(--chalk)' }}>@{me.username}</b></span>
      </div>
      {!social.loaded && <div className="skeleton-list" aria-busy="true" aria-label="Loading friends"><i /><i /><i /></div>}
      {msg && <p className={`small ${msg.ok ? 'accent' : ''}`} style={msg.ok ? undefined : { color: 'var(--hot)' }} role="status">{msg.text}</p>}

      <div className="friends-grid">
        <div className="stack">
          <form className="panel pad stack" onSubmit={(e) => { e.preventDefault(); act(() => onJoin(code)) }}>
            <h3>Join with a code</h3>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="num code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" aria-label="Game code" />
              <button className="btn primary" disabled={code.trim().length !== 6}>Join <ArrowRight weight="bold" /></button>
            </div>
          </form>

          {invites.length > 0 && (
            <div className="panel pad stack">
              <h3>Game invites</h3>
              {invites.map((inv) => (
                <motion.div key={inv.id} className="person" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <span><b>@{inv.from.username}</b> invited you to a game</span>
                  <span className="row">
                    <button className="btn primary sm" onClick={() => act(async () => { await onJoin(await codeForInvite(inv.id)); await dismissInvite(inv.id) })}>Join</button>
                    <button className="btn ghost sm" aria-label="Dismiss invite" onClick={() => act(() => dismissInvite(inv.id))}><X weight="bold" /></button>
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {incoming.length > 0 && (
            <div className="panel pad stack">
              <h3>Friend requests</h3>
              {incoming.map((f) => (
                <div key={f.id} className="person">
                  <span><b>@{f.requester.username}</b></span>
                  <span className="row">
                    <button className="btn primary sm" onClick={() => act(() => acceptRequest(f.id), `You and @${f.requester.username} are now friends.`)}><Check weight="bold" /> Accept</button>
                    <button className="btn ghost sm" aria-label="Decline" onClick={() => act(() => removeFriendship(f.id))}><X weight="bold" /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="panel pad stack">
            <h3>Find players</h3>
            <label className="field" style={{ position: 'relative' }}>
              <MagnifyingGlass style={{ position: 'absolute', left: 13, top: 15, color: 'var(--faint)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search usernames" style={{ paddingLeft: 36 }} aria-label="Search usernames" />
            </label>
            {q.trim().length >= 2 && found.length === 0 && <p className="small dim">Nobody with a username starting "{q.trim()}".</p>}
            {found.map((p) => {
              const r = relation(p.id)
              return (
                <div key={p.id} className="person">
                  <span>@{p.username}</span>
                  {r ? <span className="small dim">{r}</span> : (
                    <button className="btn ghost sm" onClick={() => act(() => sendFriendRequest(me.id, p.id), `Request sent to @${p.username}.`)}><UserPlus weight="bold" /> Add</button>
                  )}
                </div>
              )
            })}
            {outgoing.length > 0 && <p className="small dim">Waiting on: {outgoing.map((f) => `@${f.addressee.username}`).join(', ')}</p>}
          </div>
        </div>

        <div className="stack">
          <div className="panel pad stack">
            <h3><Trophy weight="fill" color="var(--accent)" /> Leaderboard</h3>
            {board.length <= 1 && <p className="small dim">Add friends and finish online games together to fill this up.</p>}
            <table className="table">
              <thead><tr><th>#</th><th>Player</th><th>Wins</th><th>Played</th></tr></thead>
              <tbody>
                {board.map((s, i) => (
                  <tr key={s.id} className={s.id === me.id ? 'lead' : ''}>
                    <td>{i + 1}</td><td>@{s.username}</td><td>{s.wins}</td><td>{s.played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel pad stack">
            <h3>Your friends ({friends.length})</h3>
            {friends.length === 0 && <p className="small dim">Search for a username to send your first request.</p>}
            {friends.map((f) => (
              <div key={f.id} className="person">
                <span>@{f.username}</span>
                <button className="btn ghost sm" onClick={() => confirm(`Remove @${f.username} as a friend?`) && act(() => removeFriendship(f.friendship))}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
