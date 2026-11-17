import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react'
import { Check, Eye, EyeSlash, MagicWand, X } from '@phosphor-icons/react'
import { rules, strength, strengthWord, suggest } from '../../game/engine/password'
import { sfx } from '../../game/engine/sfx'

type Props = {
  value: string
  onChange: (v: string) => void
  email?: string
  /** new account: show the meter, the rules and the suggestion button */
  create?: boolean
  onReveal?: (shown: boolean) => void
  onCaret?: (at: number) => void
  autoFocus?: boolean
}

const levelColour = (s: number) => (s < 0.4 ? 'var(--hot)' : s < 0.8 ? 'var(--amber)' : 'var(--accent)')

/**
 * Monospaced so every character sits in the same cell: hidden dots and revealed letters line up, and each
 * one morphs into the other in place. On a new account the field's own outline is the strength meter.
 */
export default function PasswordField({ value, onChange, email = '', create = false, onReveal, onCaret, autoFocus }: Props) {
  const reduce = useReducedMotionConfig()
  const [shown, setShown] = useState(false)
  const [scroll, setScroll] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const s = create ? strength(value, email) : 0
  const rs = create ? rules(value, email) : []
  const wasStrong = useRef(false)

  // a chime the moment it crosses into strong
  useEffect(() => {
    const strong = s >= 0.85
    if (strong && !wasStrong.current) sfx.strong()
    wasStrong.current = strong
  }, [s])

  const toggle = () => {
    const next = !shown
    setShown(next)
    onReveal?.(next)
    if (next) sfx.reveal(); else sfx.conceal()
    input.current?.focus()
  }
  const sync = () => {
    const el = input.current
    if (!el) return
    setScroll(el.scrollLeft)
    onCaret?.(el.value.length ? (el.selectionEnd ?? el.value.length) / Math.max(12, el.value.length) : 0)
  }
  const recommend = () => {
    const pw = suggest(email)
    onChange(pw)
    sfx.sparkle()
    if (!shown) { setShown(true); onReveal?.(true) } // a suggestion you can't see is no use
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(pw.length, pw.length); sync() })
  }

  return (
    <div className="pw">
      <div className={`pw-field ${create ? 'metered' : ''}`} style={{ ['--meter' as string]: levelColour(s) }}>
        {/* the outline is the meter: it draws itself round the field as the password gets stronger */}
        {create && (
          <svg className="pw-meter" aria-hidden preserveAspectRatio="none">
            <rect className="track" x="1" y="1" rx="11" ry="11" style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }} pathLength={1} />
            <motion.rect className="fill" x="1" y="1" rx="11" ry="11" style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }} pathLength={1}
              initial={false} animate={{ pathLength: s }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }} />
          </svg>
        )}
        <input
          ref={input}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => { onChange(e.target.value); sfx.key(); requestAnimationFrame(sync) }}
          onKeyUp={sync}
          onClick={sync}
          onSelect={sync}
          onScroll={sync}
          autoComplete={create ? 'new-password' : 'current-password'}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          aria-label="Password"
          aria-describedby={create ? 'pw-rules' : undefined}
          placeholder="Password"
          maxLength={72}
        />
        {/* what you actually see: one cell per character, a dot or the letter, swapping in place */}
        <div className="pw-cells" aria-hidden style={{ transform: `translateX(${-scroll}px)` }}>
          {[...value].map((ch, i) => (
            <span key={i} className="pw-cell">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={shown ? `c${ch}` : 'dot'}
                  initial={reduce ? false : { opacity: 0, scale: shown ? 0.4 : 1.6, filter: 'blur(6px)', y: shown ? 6 : -6 }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, scale: shown ? 1.6 : 0.4, filter: 'blur(6px)' }}
                  transition={{ duration: 0.28, delay: reduce ? 0 : Math.min(i, 20) * 0.018, ease: [0.16, 1, 0.3, 1] }}
                >
                  {shown ? ch : '•'}
                </motion.span>
              </AnimatePresence>
            </span>
          ))}
        </div>
        <button type="button" className="pw-eye" onClick={toggle} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'}>
          {shown ? <EyeSlash weight="bold" /> : <Eye weight="bold" />}
        </button>
      </div>
      {create && (
        <>
          <div className="pw-under">
            <span className="small pw-word" style={{ color: levelColour(s) }} aria-live="polite">{strengthWord(s)}</span>
            <button type="button" className="linkish small" onClick={recommend}><MagicWand weight="bold" /> Suggest a strong one</button>
          </div>
          <ul className="pw-rules" id="pw-rules" aria-label="Password rules" hidden={!value}>
            {rs.map((r) => (
              <li key={r.id} className={r.ok ? 'ok' : ''}>
                <motion.span key={String(r.ok)} initial={reduce ? false : { scale: 0.4, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                  {r.ok ? <Check weight="bold" /> : <X weight="bold" />}
                </motion.span>
                {r.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
