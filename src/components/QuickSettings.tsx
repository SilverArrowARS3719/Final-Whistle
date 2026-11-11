import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MusicNotes, ShieldCheck, SlidersHorizontal, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react'
import { setTracking, trackingOn } from '../online/track'
import ColourLab from '../theme/ThemeLab'
import Seg from './Seg'
import { loadSound, setSound, sfx, type TrackId } from '../engine/sfx'

const TRACKS: { id: TrackId; name: string; desc: string }[] = [
  { id: 'off', name: 'Off', desc: 'Just the game sounds.' },
  { id: 'matchday', name: 'Matchday', desc: 'Upbeat broadcast groove.' },
  { id: 'floodlights', name: 'Floodlights', desc: 'Slow, calm pads for long drafts.' },
  { id: 'terrace', name: 'Terrace', desc: 'Crowd noise, stomp, stomp, clap.' },
]

/** One floating button for per-device settings: colours and sound. Mounted once in main.tsx. */
export default function QuickSettings() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'Sound' | 'Colours' | 'Privacy'>('Sound')

  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])

  return (
    <>
      <button className="lab-fab btn glass" onClick={() => setOpen(true)} aria-label="Open settings">
        <SlidersHorizontal weight="bold" /> Settings
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="lab-scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="lab"
              role="dialog"
              aria-label="Settings"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <header>
                <h3>Settings</h3>
                <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Close"><X weight="bold" /></button>
              </header>
              <Seg id="qs-tab" options={['Sound', 'Colours', 'Privacy'] as ('Sound' | 'Colours' | 'Privacy')[]} value={tab} onChange={setTab} />
              {tab === 'Sound' ? <SoundPanel /> : tab === 'Colours' ? <ColourLab /> : <PrivacyPanel />}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function SoundPanel() {
  const [s, set] = useState(loadSound)
  const update = (patch: Parameters<typeof setSound>[0]) => set(setSound(patch))
  return (
    <div className="stack sound-panel" style={{ gap: 20 }}>
      <button className={`btn ${s.muted ? 'primary' : ''}`} onClick={() => update({ muted: !s.muted })} aria-pressed={s.muted}>
        {s.muted ? <><SpeakerSlash weight="fill" /> Sound is off</> : <><SpeakerHigh weight="fill" /> Mute everything</>}
      </button>
      <label className="field">
        <span className="label">Game sounds <b className="num">{Math.round(s.effects * 100)}%</b></span>
        <input type="range" min={0} max={1} step={0.05} value={s.effects} disabled={s.muted}
          onChange={(e) => update({ effects: Number(e.target.value) })} onPointerUp={() => sfx.pick()} onKeyUp={() => sfx.pick()} />
      </label>
      <label className="field">
        <span className="label">Music <b className="num">{Math.round(s.music * 100)}%</b></span>
        <input type="range" min={0} max={1} step={0.05} value={s.music} disabled={s.muted} onChange={(e) => update({ music: Number(e.target.value) })} />
      </label>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label"><MusicNotes weight="bold" /> Music track</span>
        <div className="track-list" role="radiogroup" aria-label="Music track">
          {TRACKS.map((t) => (
            <button key={t.id} role="radio" aria-checked={s.track === t.id} className={`track ${s.track === t.id ? 'on' : ''}`} onClick={() => update({ track: t.id })}>
              <b>{t.name}</b><span>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="label" style={{ width: '100%' }}>Try a sound</span>
        <button className="btn sm" onClick={() => sfx.goal()}>Goal</button>
        <button className="btn sm" onClick={() => sfx.whistle(true)}>Whistle</button>
        <button className="btn sm" onClick={() => sfx.flip()}>Card flip</button>
        <button className="btn sm" onClick={() => sfx.perfect()}>Perfect XI</button>
      </div>
    </div>
  )
}

function PrivacyPanel() {
  const [on, set] = useState(trackingOn)
  return (
    <div className="stack" style={{ gap: 16 }}>
      <p className="small dim">
        The Draft Room counts how the game is used: which screens you open, which modes you finish, how long a visit lasts.
        It uses a random id for this browser. No names, emails or messages are sent. It helps decide what to fix and what to build next.
      </p>
      <button className={`btn ${on ? '' : 'primary'}`} aria-pressed={!on} onClick={() => { setTracking(!on); set(!on) }}>
        <ShieldCheck weight="bold" /> {on ? 'Stop sharing usage stats' : 'Usage stats are off. Turn back on'}
      </button>
    </div>
  )
}
