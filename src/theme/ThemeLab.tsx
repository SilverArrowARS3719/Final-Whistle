import { useMemo, useState } from 'react'
import { Check, LockSimple } from '@phosphor-icons/react'
import { levelOf, loadProgress, paletteLevel } from '../engine/progress'
import { DEFAULT_ID, PALETTES, applyTheme, deriveTheme, savedTheme } from './palettes'

applyTheme(savedTheme()) // before first paint, so a saved theme never flashes the default

/** The palette grid inside the quick settings sheet. */
export default function ColourLab() {
  const [id, setId] = useState(savedTheme)
  const looks = useMemo(() => PALETTES.map((p) => ({ p, t: deriveTheme(p) })), [])
  const choose = (next: string) => { setId(next); applyTheme(next) }
  const level = levelOf(loadProgress().xp).level

  return (
    <>
      <p className="small dim">Tap a palette and the whole app changes. Level up to unlock more (you're level {level}).</p>
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
        {looks.map(({ p, t }, i) => {
          const need = paletteLevel(i)
          const locked = need > level && id !== p.id
          return (
          <button key={p.id} className={`lab-card ${id === p.id ? 'on' : ''} ${locked ? 'locked' : ''}`} role="radio" aria-checked={id === p.id} disabled={locked} onClick={() => choose(p.id)}>
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
            {locked && <span className="lab-lock"><LockSimple weight="fill" /> Level {need}</span>}
          </button>
          )
        })}
      </div>
    </>
  )
}
