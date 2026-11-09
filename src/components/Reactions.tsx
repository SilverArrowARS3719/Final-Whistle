import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { OnlineStore, Reaction } from '../online/game'
import { sfx } from '../engine/sfx'

const EMOJIS = ['🔥', '😂', '😱', '👏', '😤', '⚽']

/** Online only: a row of emoji anyone can fire; everyone in the game sees them float up with the sender's name. */
export default function Reactions({ store, me }: { store: OnlineStore; me: string }) {
  const [live, setLive] = useState<(Reaction & { x: number })[]>([])
  const lastSent = useRef(0)

  useEffect(() => store.onReact((r) => {
    if (r.from !== me) sfx.react()
    const item = { ...r, x: 10 + Math.random() * 80 }
    setLive((l) => [...l.slice(-12), item])
    setTimeout(() => setLive((l) => l.filter((x) => x.id !== r.id)), 2600)
  }), [store, me])

  const send = (emoji: string) => {
    if (Date.now() - lastSent.current < 500) return // no spamming
    lastSent.current = Date.now()
    store.react(emoji, me)
  }

  return (
    <>
      <div className="react-float" aria-live="polite">
        <AnimatePresence>
          {live.map((r) => (
            <motion.div key={r.id} className="react-pop" style={{ left: `${r.x}%` }}
              initial={{ y: 0, opacity: 0, scale: 0.4 }} animate={{ y: -260, opacity: [0, 1, 1, 0], scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}>
              <span aria-hidden>{r.emoji}</span>
              <b>{r.from === me ? 'You' : `@${r.from}`}</b>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="react-bar" role="group" aria-label="Send a reaction">
        {EMOJIS.map((e) => (
          <motion.button key={e} whileTap={{ scale: 1.35 }} onClick={() => send(e)} aria-label={`React ${e}`}>{e}</motion.button>
        ))}
      </div>
    </>
  )
}
