import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CaretDown, ChatCircleText, ClockCounterClockwise, Compass, GearSix, List, Question, SignOut, Trophy, UserCircle, UsersThree } from '@phosphor-icons/react'
import { openSettings } from './QuickSettings'
import { openFeedback } from './Feedback'
import { openHelp } from './Coach'

type Level = { level: number; title: string; into: number; need: number }
type Props = {
  /** null = not logged in: the menu still opens, without the profile bits */
  me: string | null
  handle?: boolean // show as @username (an online account)
  level: Level
  invites: number
  onProfile: () => void
  onLeagues?: () => void
  onFriends?: () => void
  onTour: () => void
  onSignOut?: () => void
  /** in a game: just the avatar, the crumbs need the room */
  compact?: boolean
}

/**
 * The account chip in the top bar. Hover (or tap) and it drops a menu: profile, leagues, friends,
 * settings, then help. Keeps the bar to three things instead of six.
 */
export default function AccountMenu({ me, handle, level, invites, onProfile, onLeagues, onFriends, onTour, onSignOut, compact }: Props) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const closing = useRef<number>(0)
  const hoverable = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches

  // a short grace period so the pointer can travel from the chip down into the menu
  const enter = () => { clearTimeout(closing.current); if (hoverable) setOpen(true) }
  const leave = () => { if (hoverable) closing.current = window.setTimeout(() => setOpen(false), 220) }
  useEffect(() => () => clearTimeout(closing.current), [])

  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); wrap.current?.querySelector<HTMLButtonElement>('.acct-trigger')?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = [...(wrap.current?.querySelectorAll<HTMLButtonElement>('.acct-item') ?? [])]
        const at = items.indexOf(document.activeElement as HTMLButtonElement)
        items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
        e.preventDefault()
      }
    }
    addEventListener('pointerdown', out)
    addEventListener('keydown', key)
    return () => { removeEventListener('pointerdown', out); removeEventListener('keydown', key) }
  }, [open])

  const go = (fn?: () => void) => () => { setOpen(false); fn?.() }
  const item = (icon: ReactNode, label: string, onClick?: () => void, hint?: string, badge?: number) => (
    <button key={label} className="acct-item" role="menuitem" onClick={go(onClick)}>
      {icon}
      <span>{label}</span>
      {badge ? <span className="badge num">{badge}</span> : hint ? <kbd>{hint}</kbd> : <i />}
    </button>
  )
  const pct = Math.round((level.into / Math.max(1, level.need)) * 100)

  return (
    <div className="acct" ref={wrap} onPointerEnter={enter} onPointerLeave={leave}>
      <button className={`acct-trigger ${me ? '' : 'guest'} ${compact ? 'compact' : ''}`} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)} aria-label={me ? `Your account, ${me}` : 'Menu'}>
        {me ? <span className="avatar" aria-hidden>{me[0]?.toUpperCase()}</span> : <List weight="bold" />}
        {!compact && (me
          ? <span className="me-copy"><b>{handle ? `@${me}` : me}</b><span>Level {level.level} · {level.title}</span></span>
          : <span className="acct-guest">Menu</span>)}
        {invites > 0 && <span className="badge num acct-dot">{invites}</span>}
        <CaretDown weight="bold" className="acct-caret" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="acct-menu" role="menu" aria-label="Account"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
            {me && (
              <button className="acct-head" onClick={go(onProfile)}>
                <span className="acct-badge" aria-hidden>{me[0]?.toUpperCase()}</span>
                <span className="acct-id">
                  <b>{handle ? `@${me}` : me}</b>
                  <span className="num">LV {level.level} · {level.title}</span>
                  <span className="acct-xp" aria-label={`${level.into} of ${level.need} XP to level ${level.level + 1}`}><i style={{ width: `${pct}%` }} /></span>
                </span>
              </button>
            )}
            <div className="acct-group">
              {me && item(<UserCircle weight="bold" />, 'Profile', onProfile, 'Stats')}
              {onLeagues && item(<Trophy weight="bold" />, 'Leagues', onLeagues)}
              {onFriends && item(<UsersThree weight="bold" />, 'Friends', onFriends, undefined, invites)}
              {item(<GearSix weight="bold" />, 'Settings', () => openSettings())}
            </div>
            <div className="acct-group">
              {item(<Question weight="bold" />, 'Help on this page', openHelp, '?')}
              {item(<Compass weight="bold" />, 'Show me around again', onTour)}
              {item(<ClockCounterClockwise weight="bold" />, "What's new", () => openSettings('Updates'))}
              {item(<ChatCircleText weight="bold" />, 'Send feedback', () => openFeedback('menu'))}
            </div>
            {me && onSignOut && (
              <div className="acct-group">
                {item(<SignOut weight="bold" />, 'Log out', onSignOut)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The round "?" in the top bar: Kicko's tips for whatever screen you're on. */
export function HelpButton() {
  return <button className="icon-btn" onClick={openHelp} aria-label="Help for this screen" title="Help for this screen"><Question weight="bold" /></button>
}
