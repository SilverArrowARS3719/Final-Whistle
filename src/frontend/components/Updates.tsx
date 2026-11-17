import { ChatCircleText } from '@phosphor-icons/react'
import { RELEASES, VERSION } from '../changelog'
import { openFeedback } from './Feedback'

const when = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** Settings → Updates: every version, newest first, as a timeline. */
export default function Updates() {
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="upd-now">
        <span className="small dim">You're on</span>
        <b className="num">Version {VERSION}</b>
        <button className="btn ghost sm" onClick={() => openFeedback('settings')}><ChatCircleText weight="bold" /> Send feedback</button>
      </div>
      <ol className="upd-line">
        {RELEASES.map((r, i) => (
          <li key={r.version} className={i === 0 ? 'latest' : ''}>
            <span className="upd-dot" aria-hidden />
            <div className="upd-head">
              <b className="num">{r.version}</b>
              <span className="upd-title">{r.title}</span>
              {i === 0 && <span className="upd-tag">Latest</span>}
            </div>
            <time className="small dim" dateTime={r.date}>{when(r.date)}</time>
            <ul>{r.changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
