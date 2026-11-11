import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Shuffle, Trophy } from '@phosphor-icons/react'
import { COMPETITIONS, TEAMS, squadOf } from '../data/winners'
import { TROPHIES, TROPHY_NAME } from '../engine/career'
import { PLAYERS, type Player } from '../data/players'
import { SMALL_SIDED } from '../data/formations'
import Backdrop from '../components/Backdrop'
import { CardFace } from '../components/ChaosCard'
import Pitch from '../components/Pitch'
import PlayerCard from '../components/PlayerCard'
import { AUCTION, CHAOS, SOT } from '../engine/config'
import { CARDS, type Active, type Category } from '../engine/chaos'
import { newTeam } from '../engine/draft'
import { teamCap } from '../engine/stickOrTwist'
import { budgetFor } from './SizePick'

const ease = [0.16, 1, 0.3, 1] as const
const rise = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } }
const byName = (n: string) => PLAYERS.find((p) => p.name === n) as Player

// Ticks every `ms` while motion is allowed; returns the tick count.
function useTicker(ms: number) {
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setT((x) => x + 1), ms)
    return () => clearInterval(id)
  }, [ms, reduce])
  return t
}

function Hero({ title, accent, lede, cta, onStart, children }: { title: string; accent: string; lede: string; cta: string; onStart: () => void; children: ReactNode }) {
  return (
    <section className="hero">
      <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.09, delayChildren: 0.1 }}>
        <motion.h1 variants={rise}>{title}<br /><em>{accent}</em></motion.h1>
        <motion.p className="lede" variants={rise}>{lede}</motion.p>
        <motion.div className="ctas" variants={rise}>
          <button className="btn primary lg" onClick={onStart}>{cta} <ArrowRight weight="bold" /></button>
          <a className="btn ghost lg" href="#how">How it works</a>
        </motion.div>
      </motion.div>
      <motion.div className="hero-stage mh-stage" initial={{ opacity: 0, rotateX: 30, y: 60 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ duration: 1.1, ease }}>
        {children}
      </motion.div>
    </section>
  )
}

function Closer({ line, cta, onStart }: { line: string; cta: string; onStart: () => void }) {
  return (
    <section className="closer">
      <h2>{line}</h2>
      <button className="btn primary lg" onClick={onStart}>{cta} <ArrowRight weight="bold" /></button>
    </section>
  )
}

const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.7, delay: i * 0.08, ease },
})

/* ---------------- Stick or Twist ---------------- */

const DEAL = ['Kevin De Bruyne', 'Jordan Henderson', 'Zinedine Zidane', 'Hugo Larsson', 'Lionel Messi', 'Joey Veerman', 'Cafu', 'Morten Hjulmand'].map(byName)

export function SotHero({ onStart }: { onStart: () => void }) {
  const t = useTicker(2600)
  const cap = teamCap()
  const dealt = DEAL[t % DEAL.length]
  const total = 760 + ((t * 37) % 190) // illustrative running total for the meter
  const steps = [
    ['Deal', 'You get a random player whose natural position is your next slot. No choosing.'],
    ['Stick', 'Keep him. He is locked into the slot and the turn passes on.'],
    ['Twist', `Throw him away for another random one. ${SOT.twists} twists for the whole draft; discards are gone for everyone.`],
    ['Settle', 'After 11 slots the total is checked against the cap. Over it is a bust; just under it is a Perfect XI.'],
  ]
  return (
    <div className="mh sot">
      <Backdrop src="/img/sot.jpg" />
      <Hero title="Stick. Twist." accent="Don't bust." lede="You don't pick players, you're dealt them. Gamble for better ones, but the whole XI has to fit under the cap." cta="Deal me in" onStart={onStart}>
        <div className="dealer">
          <div className="deck" aria-hidden>{[0, 1, 2].map((k) => <span key={k} style={{ translate: `${k * 5}px ${-k * 5}px` }} />)}</div>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={dealt.id}
              className="dealt"
              initial={{ x: -170, y: -10, rotateY: 180, rotate: -12, opacity: 0 }}
              animate={{ x: 0, y: 0, rotateY: 0, rotate: 4, opacity: 1 }}
              exit={{ x: 220, y: 40, rotate: 25, opacity: 0, transition: { duration: 0.4 } }}
              transition={{ type: 'spring', stiffness: 90, damping: 14 }}
            >
              <PlayerCard p={dealt} tilt={false} />
            </motion.div>
          </AnimatePresence>
          <div className="dealer-meter panel">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="dim small">Team total</span>
              <b className="num">{total} <span className="dim">/ {cap}</span></b>
            </div>
            <div className="meter tight"><motion.span animate={{ width: `${(total / cap) * 100}%` }} transition={{ duration: 0.8, ease }} /></div>
          </div>
        </div>
      </Hero>

      <section className="how" id="how">
        <h2>One turn, four words.</h2>
        <div className="flip-row">
          {steps.map(([word, body], i) => (
            <motion.div key={word} className="flip" tabIndex={0} {...reveal(i)}>
              <div className="flip-inner">
                <div className="flip-face front"><span className="display">{word}</span></div>
                <div className="flip-face back"><p>{body}</p></div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mh-split">
        <motion.div className="mh-big num" {...reveal()}>{cap}</motion.div>
        <motion.div className="stack" {...reveal(1)}>
          <h2>The cap is worked out from the player pool.</h2>
          <p className="dim">It is 11 times the average rating plus a small margin, so it stays fair as the database grows.</p>
          <div className="verdicts">
            <div className="verdict-mini bust"><b>Bust</b><span>Over the cap: your best players are swapped for sub-75s until you're under.</span></div>
            <div className="verdict-mini perfect"><b>Perfect XI</b><span>Within {SOT.perfectWindow} of the cap: every player gets +2 in the match.</span></div>
          </div>
        </motion.div>
      </section>

      <Closer line="Fifteen seconds per decision. Hold your nerve." cta="Deal me in" onStart={onStart} />
    </div>
  )
}

/* ---------------- Chaos Draft ---------------- */

const CATS: [Category, string][] = [['restriction', 'Restrictions'], ['modifier', 'Modifiers'], ['wild', 'Wild cards']]
const sample = (id: string, ctx: Active['ctx'] = {}): Active => ({ card: CARDS.find((c) => c.id === id)!, ctx })

export function ChaosHero({ onStart }: { onStart: () => void }) {
  const [hand, setHand] = useState([sample('samba'), sample('captain'), sample('steal')])
  const shuffle = () => {
    const pool = CARDS.filter((c) => c.id !== 'calm' && !hand.some((h) => h.card === c)).sort(() => Math.random() - 0.5)
    setHand(pool.slice(0, 3).map((c) => ({ card: c, ctx: { era: '90s', nation: 'Argentina', league: 'Serie A' } })))
  }
  const odds = Object.entries(CHAOS.weights) as [string, number][]
  return (
    <div className="mh chaos">
      <Backdrop src="/img/chaos.jpg" />
      <Hero title="Every round," accent="new rules." lede="Every round, each player is dealt their own Chaos Card. You might get Brazilians only while your mate gets World Champions only. Pure luck of the draw." cta="Flip the first card" onStart={onStart}>
        <div className="fan-cards">
          <AnimatePresence mode="popLayout">
            {hand.map((a, k) => (
              <motion.div
                key={a.card.id}
                className="fan-chaos"
                initial={{ rotateY: 180, y: 80, opacity: 0 }}
                animate={{ rotateY: 0, y: [0, -10, 0], rotate: (k - 1) * 9, x: `${(k - 1) * 78}%`, opacity: 1 }}
                exit={{ y: -120, opacity: 0, transition: { duration: 0.3 } }}
                transition={{ rotateY: { type: 'spring', stiffness: 80, damping: 13, delay: k * 0.1 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: k }, default: { duration: 0.6, ease } }}
                style={{ zIndex: k === 1 ? 2 : 1 }}
              >
                <CardFace a={a} />
              </motion.div>
            ))}
          </AnimatePresence>
          <button className="btn glass shuffle" onClick={shuffle}><Shuffle weight="bold" /> Shuffle</button>
        </div>
      </Hero>

      <section className="deck-gallery" id="how">
        <motion.h2 {...reveal()}>{CARDS.length} cards in the deck.</motion.h2>
        {CATS.map(([cat, label]) => (
          <div key={cat} className="stack" style={{ gap: 12 }}>
            <h3>{label}</h3>
            <div className="card-strip">
              {CARDS.filter((c) => c.category === cat).map((c, i) => (
                <motion.div key={c.id} {...reveal(i % 6)}>
                  <CardFace a={{ card: c, ctx: { era: '90s', nation: 'France', league: 'Serie A', letter: 'M' } }} small />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mh-split">
        <motion.div className="stack" {...reveal()}>
          <h2>Rarer cards break more.</h2>
          <p className="dim">Steal is legendary: at most one each per draft. Table cards (Reverse, Shield, Pass It On) sometimes land on top of everyone's own card, at most twice a game. Never two wild cards in a row, and every restriction is checked so nobody is left with nothing to pick.</p>
        </motion.div>
        <motion.div className="odds" {...reveal(1)}>
          {odds.map(([r, w]) => (
            <div key={r} className={`odds-row ${r}`}>
              <span>{r}</span>
              <div className="odds-bar"><motion.span initial={{ width: 0 }} whileInView={{ width: `${w * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, ease }} /></div>
              <b className="num">{Math.round(w * 100)}%</b>
            </div>
          ))}
        </motion.div>
      </section>

      <Closer line="No two drafts play the same way." cta="Flip the first card" onStart={onStart} />
    </div>
  )
}

/* ---------------- Auction ---------------- */

const LOTS = ['Thierry Henry', 'Paolo Maldini', 'Andrea Pirlo', 'Iker Casillas'].map(byName)
const BIDDERS = ['Ravi', 'Ana', 'Kenji']

export function AuctionHero({ onStart }: { onStart: () => void }) {
  const t = useTicker(4200)
  const lot = LOTS[t % LOTS.length]
  const bids = BIDDERS.map((_, k) => ((t * 7 + k * 5) % 9) * 0.5 + 1.5)
  const top = Math.max(...bids)
  const steps = [
    ['Lot', 'A random player from any position goes up. In a blind auction he stays a mystery until someone wins him.'],
    ['Raise', 'Take turns raising by £0.5M, £1M, £2M or £5M, or go all in. The price is open for everyone to see.'],
    ['Drop', 'Too rich for you? Drop out of that lot. The last bidder standing wins and he goes into their best-fitting slot.'],
    ['Fill', 'Nobody bids and he is gone. Once only one team still needs players, the rest of their slots fill for free.'],
  ]
  return (
    <div className="mh auction">
      <Backdrop src="/img/auction.jpg" />
      <Hero title="Every player" accent="has a price." lede="Open bidding, a fixed budget, 5 or 7 a side. Any player can come up next, or play it blind and only find out who you bought after you win him." cta="Open the auction" onStart={onStart}>
        <div className="lot-stage">
          <AnimatePresence mode="popLayout">
            <motion.div key={lot.id} className="lot-card" initial={{ scale: 0.8, opacity: 0, rotateY: 90 }} animate={{ scale: 1.15, opacity: 1, rotateY: 0 }} exit={{ opacity: 0, x: -120, transition: { duration: 0.35 } }} transition={{ type: 'spring', stiffness: 90, damping: 14 }}>
              <PlayerCard p={lot} tilt={false} />
              <motion.span className="stamp sold" initial={{ scale: 3, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ delay: 1.9, type: 'spring', stiffness: 260, damping: 14 }}>
                Sold £{top}M
              </motion.span>
            </motion.div>
          </AnimatePresence>
          <div className="bids">
            {BIDDERS.map((b, k) => (
              <motion.div key={`${t}-${b}`} className={`bid-card ${bids[k] === top ? 'win' : ''}`} initial={{ rotateY: 180, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ delay: 0.6 + k * 0.25, type: 'spring', stiffness: 120, damping: 14 }} style={{ transformPerspective: 800 }}>
                <span className="label">{b}</span>
                <b className="num">£{bids[k]}M</b>
              </motion.div>
            ))}
          </div>
        </div>
      </Hero>

      <section className="how" id="how">
        <h2>How a lot works.</h2>
        <ol className="timeline-steps">
          {steps.map(([word, body], i) => (
            <motion.li key={word} {...reveal(i)}>
              <strong>{word}</strong>
              <p className="dim">{body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="budgets">
        {([5, 7] as const).map((size, i) => (
          <motion.div key={size} className="panel pad stack" {...reveal(i)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>{size}-a-side</h3>
              <b className="num budget">£{budgetFor(size)}M</b>
            </div>
            <Pitch team={newTeam(`${size}`, `${size}-a-side`, SMALL_SIDED[size])} footer={false} compact interactive={false} />
            <p className="small dim">Opening bid £{AUCTION.minBid}M. {AUCTION.maxUnsoldInARow} unsold players in a row and the position is handed out free.</p>
          </motion.div>
        ))}
      </section>

      <Closer line="Know your budget. Know when to pass." cta="Open the auction" onStart={onStart} />
    </div>
  )
}

/* ---------------- Team of Winners ---------------- */

const SHOWCASE = ['ucl', 'world-cup', 'uel', 'premier-league', 'libertadores', 'taca-de-portugal', 'afcon', 'la-liga']

export function WinnersHero({ onStart }: { onStart: () => void }) {
  const t = useTicker(2800)
  const comps = COMPETITIONS.filter((c) => SHOWCASE.includes(c.id))
  const c = comps[t % comps.length]
  const star = [...squadOf(c.winner)].sort((a, b) => b.ovr - a.ovr)[0]
  const regions = [...new Set(COMPETITIONS.map((x) => x.region))]
  const steps = [
    ['Slot', 'Tap any empty spot: a position in your XI or one of nine bench places.'],
    ['Spin', `${COMPETITIONS.length} trophies on the wheel. It lands on one, and you draft from whoever holds it right now.`],
    ['Pick', 'Anyone in their current squad who can play that slot. New signings count; players who have left do not.'],
    ['Clash', 'A club someone else got this round is off your wheel. Next round it is back, minus the player they took.'],
  ]
  return (
    <div className="mh winners">
      <Backdrop src="/img/winners.jpg" />
      <Hero title="Only winners" accent="get picked." lede="Every player comes from a club or country holding a trophy right now. Build 20 men from the spin of a wheel, then take them through three Premier League seasons and try to win all six." cta="Start drafting" onStart={onStart}>
        <div className="win-stage">
          <AnimatePresence mode="popLayout">
            <motion.div key={c.id} className="win-card" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0, transition: { duration: 0.3 } }} transition={{ type: 'spring', stiffness: 110, damping: 15 }}>
              <span className="label">{c.name} · {c.edition}</span>
              <h3>{TEAMS[c.winner].name}</h3>
              {star && <PlayerCard p={star} tilt={false} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Hero>

      <section className="how" id="how">
        <h2>One turn, four steps.</h2>
        <ol className="timeline-steps">
          {steps.map(([word, body], i) => (
            <motion.li key={word} {...reveal(i)}>
              <strong>{word}</strong>
              <p className="dim">{body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="win-trophies">
        <motion.h2 {...reveal()}>Six trophies. Three seasons.</motion.h2>
        <p className="dim" style={{ maxWidth: '60ch' }}>Your club plays in the Premier League. First to win every one of these at least once wins outright. Nobody does? Most trophies after three seasons.</p>
        <div className="win-six">
          {TROPHIES.map((k, i) => (
            <motion.div key={k} className="panel pad" {...reveal(i)}><Trophy weight="fill" /><b>{TROPHY_NAME[k]}</b></motion.div>
          ))}
        </div>
      </section>

      <section className="win-wheel-list">
        <motion.h2 {...reveal()}>Who holds what.</motion.h2>
        <div className="win-regions">
          {regions.map((r, i) => (
            <motion.div key={r} className="panel pad stack" {...reveal(i % 4)}>
              <h3>{r}</h3>
              {COMPETITIONS.filter((x) => x.region === r).map((x) => (
                <div key={x.id} className="win-line"><span>{x.name}</span><b>{TEAMS[x.winner].name}</b></div>
              ))}
            </motion.div>
          ))}
        </div>
      </section>

      <Closer line="Spin. Pick. Win everything." cta="Start drafting" onStart={onStart} />
    </div>
  )
}
