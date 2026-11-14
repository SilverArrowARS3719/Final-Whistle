import { CalendarCheck, Fire } from '@phosphor-icons/react'
import { dayKey, loadDaily, streakOf } from '../../game/engine/daily'

/** Top-bar entry to the Daily Draft that says what it is, whether today's is done, and the streak. */
export default function DailyChip({ onOpen }: { onOpen: () => void }) {
  const today = dayKey()
  const history = loadDaily()
  const result = history[today]?.result
  const streak = streakOf(history, today)
  return (
    <button className={`daily-chip ${result ? 'done' : ''}`} onClick={onOpen} title="One draft puzzle a day, the same for everyone. Pick 11 players, then play three matches.">
      <CalendarCheck weight="fill" />
      <span className="daily-chip-copy">
        <b>Daily<span className="daily-chip-wide"> Draft</span></b>
        <span>{result ? <>Today <b className="num">{result.points}/9</b> · new puzzle at midnight</> : <>Today's puzzle: 11 picks, 3 matches</>}</span>
      </span>
      {!result && <span className="dot" aria-label="not played today" />}
      {streak > 0 && <span className="streak" title="Days in a row you've played the Daily"><Fire weight="fill" /> <span className="num">{streak}</span><span className="daily-chip-wide">-day streak</span></span>}
    </button>
  )
}
