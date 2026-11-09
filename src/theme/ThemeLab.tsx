import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Palette as PaletteIcon, X } from '@phosphor-icons/react'
import { DEFAULT_ID, PALETTES, applyTheme, deriveTheme, savedTheme } from './palettes'

applyTheme(savedTheme()) // before first paint, so a saved theme never flashes the default

/** Floating colour picker. Mounted once in main.tsx; delete that line to ship without it. */
export default function ThemeLab() {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(savedTheme)
  const looks = useMemo(() => PALETTES.map((p) => ({ p, t: deriveTheme(p) })), [])

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  const choose = (next: string) => { setId(next); applyTheme(next) }

  return (
    <>
      <button className="lab-fab btn glass" onClick={() => setOpen(true)} aria-label="Open colour lab">
        <PaletteIcon weight="fill" /> Colours
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="lab-scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="lab"
              role="dialog"
              aria-label="Colour lab"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <header>
                <h3>Colour lab</h3>
                <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Close"><X weight="bold" /></button>
              </header>
              <p className="small dim">Tap a palette and the whole app changes. Your pick is remembered on this device.</p>
              <div className="lab-grid" role="radiogroup" aria-label="Palettes">
                <button className={`lab-card ${id === DEFAULT_ID ? 'on' : ''}`} role="radio" aria-checked={id === DEFAULT_ID} onClick={() => choose(DEFAULT_ID)}>
                  <span className="lab-preview" style={{ background: '#090d0b' }}>
                    <i style={{ background: '#e9eee4' }} />
                    <b style={{ background: '#d2ef5b' }} />
                  </span>
                  <span className="lab-name">Floodlight <em>current</em></span>
                  <span className="lab-dots"><u style={{ background: '#090d0b' }} /><u style={{ background: '#e9eee4' }} /><u style={{ background: '#d2ef5b' }} /></span>
                  {id === DEFAULT_ID && <Check className="lab-tick" weight="bold" />}
                </button>
                {looks.map(({ p, t }) => (
                  <button key={p.id} className={`lab-card ${id === p.id ? 'on' : ''}`} role="radio" aria-checked={id === p.id} onClick={() => choose(p.id)}>
                    <span className="lab-preview" style={{ background: t._bg }}>
                      <i style={{ background: t._text }} />
                      <b style={{ background: t._accent }} />
                    </span>
                    <span className="lab-name">{p.name}</span>
                    <span className="lab-dots" title={p.colors.map((c) => c.name).join(' · ')}>
                      {p.colors.map((c) => <u key={c.name} style={{ background: c.hex }} />)}
                    </span>
                    <span className="lab-src">{p.colors.map((c) => c.name).join(' · ')}</span>
                    {id === p.id && <Check className="lab-tick" weight="bold" />}
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
