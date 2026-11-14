import { useMemo } from 'react'
import { PLAYERS } from '../../game/data/players'
import { WINNER_PLAYERS } from '../../game/data/winners'
import { dailyFor, dayKey, hashString, loadDaily, streakOf } from '../../game/engine/daily'
import { ACHIEVEMENTS, levelOf, type Progress } from '../../game/engine/progress'

const TIPS = [
  'Players from the same club or country lift each other. Watch the lines on the pitch turn green.',
  'A player out of position loses rating. A natural 86 often beats a 91 on the wrong side.',
  'In Stick or Twist, the cap decides everything. Count before you twist.',
  'Press hard and your players tire. Check the Fitness tab before extra time.',
  'Play the Daily at any time before midnight to keep your streak.',
]

/** The matchday ticker on the home page: today's puzzle, a legend, your own form. All of it real. */
export default function Ticker({ progress }: { progress: Progress }) {
  const today = dayKey()
  const items = useMemo(() => {
    const d = dailyFor(today)
    const history = loadDaily()
    const elite = PLAYERS.filter((p) => p.ovr >= 90)
    const legend = elite[hashString(`legend:${today}`) % elite.length]
    const lv = levelOf(progress.xp)
    const streak = streakOf(history, today)
    const nextBadge = ACHIEVEMENTS.find((a) => !progress.achievements[a.id])
    const out: [string, string][] = [
      ["Today's Daily", `${d.rule.name} · ${d.formation} · ${history[today]?.result ? `you scored ${history[today].result!.points}/9` : `beat ${d.opponents.map((o) => o.name).join(', ')}`}`],
      ['Legend of the day', `${legend.name} · ${legend.ovr} · ${legend.positions[0]} · ${legend.nation}, ${legend.era}`],
      ['Your form', `Level ${lv.level} ${lv.title} · ${progress.stats.won} win${progress.stats.won === 1 ? '' : 's'} from ${progress.stats.played} game${progress.stats.played === 1 ? '' : 's'}${streak ? ` · ${streak}-day Daily streak` : ''}`],
      ['In the pool', `${PLAYERS.length} all-time players · ${WINNER_PLAYERS.length} current trophy holders · 5 ways to play`],
      ['Tip', TIPS[hashString(`tip:${today}`) % TIPS.length]],
    ]
    if (nextBadge) out.splice(3, 0, ['Next badge', `${nextBadge.name}: ${nextBadge.desc} +${nextBadge.xp} XP`])
    return out
  }, [today, progress])

  const run = (hidden: boolean) => (
    <div className="ticker-run" aria-hidden={hidden || undefined}>
      {items.map(([k, v]) => <span key={k}><b>{k}</b>{v}</span>)}
    </div>
  )
  return <div className="ticker" role="marquee" aria-label="Matchday ticker">{run(false)}{run(true)}</div>
}
