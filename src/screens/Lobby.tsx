import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Copy, Crown, PaperPlaneTilt, SignOut } from '@phosphor-icons/react'
import type { GameRow } from '../online/game'
import type { Person } from '../online/social'

const MODE_NAME: Record<string, string> = { xi: 'All-Time XI', sot: 'Stick or Twist', chaos: 'Chaos Draft', auction: 'Auction', winners: 'Team of Winners' }

type Props = {
  game: GameRow
  me: string
  friends: Person[]
  onInvite: (friendId: string) => Promise<void>
  onStart: () => void
  onLeave: () => void
}

export default function Lobby({ game, me, friends, onInvite, onStart, onLeave }: Props) {
  const [sent, setSent] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const isHost = game.host === me
  const inGame = (id: string) => game.players.some((p) => p.id === id)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(game.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked: the code is on screen to read out
    }
  }

  return (
    <div>
      <div className="screen-head">
        <div className="stack" style={{ gap: 6 }}>
          <span className="dim">{MODE_NAME[game.mode] ?? game.mode} · online</span>
          <h2>Lobby</h2>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={onLeave}><SignOut weight="bold" /> {isHost ? 'Cancel game' : 'Leave'}</button>
          {isHost && (
            <button className="btn primary lg" disabled={game.players.length < 2} onClick={onStart}>
              Start with {game.players.length} <ArrowRight weight="bold" />
            </button>
          )}
        </div>
      </div>

      <div className="lobby-grid">
        <div className="panel pad stack lobby-code">
          <span className="dim">Share this code. Friends enter it under Friends → Join with a code.</span>
          <button className="code-big num" onClick={copy} aria-label={`Copy code ${game.code}`}>
            {game.code.split('').map((c, i) => <span key={i}>{c}</span>)}
            <Copy weight="bold" className="copy-ico" />
          </button>
          <span className="small accent" aria-live="polite">{copied ? 'Copied' : ' '}</span>
          {!isHost && <p className="dim">Waiting for the host to start…</p>}
        </div>

        <div className="panel pad stack">
          <h3>Players {game.players.length} / 4</h3>
          <div className="seats">
            <AnimatePresence initial={false}>
              {[0, 1, 2, 3].map((i) => {
                const p = game.players[i]
                return (
                  <motion.div key={p?.id ?? `empty-${i}`} className={`seat-row ${p ? 'filled' : ''}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <span className="seat num">{i + 1}</span>
                    {p ? (
                      <span>@{p.username}{p.id === me && ' (you)'} {p.id === game.host && <Crown weight="fill" color="var(--amber)" aria-label="Host" />}</span>
                    ) : (
                      <span className="faint">Open seat</span>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {isHost && (
          <div className="panel pad stack">
            <h3>Invite friends</h3>
            {friends.length === 0 && <p className="small dim">No friends yet. Add them from the Friends page, or share the code.</p>}
            {friends.map((f) => (
              <div key={f.id} className="person">
                <span>@{f.username}</span>
                {inGame(f.id) ? <span className="small accent">In the lobby</span> : (
                  <button className="btn ghost sm" disabled={sent.includes(f.id) || game.players.length >= 4} onClick={() => onInvite(f.id).then(() => setSent([...sent, f.id]))}>
                    <PaperPlaneTilt weight="bold" /> {sent.includes(f.id) ? 'Invited' : 'Invite'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
