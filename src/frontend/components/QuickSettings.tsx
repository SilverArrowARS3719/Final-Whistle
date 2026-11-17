import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Compass, Cookie, MusicNotes, ShieldCheck, SlidersHorizontal, SpeakerHigh, SpeakerSlash, X } from '@phosphor-icons/react'
import { setTracking, trackingOn } from '../../backend/track'
import { resetConsent } from '../../backend/consent'
import { openLegal } from '../screens/Legal'
import ColourLab from '../theme/ThemeLab'
import Seg from './Seg'
import { loadSound, setSound, sfx, type TrackId } from '../../game/engine/sfx'
import { setPrefs, usePrefs } from '../prefs'
import { resetOnboarding } from './Onboarding'
import { resetTips } from './Coach'

type Tab = 'Display' | 'Sound' | 'Colours' | 'Privacy'
const TABS: Tab[] = ['Display', 'Sound', 'Colours', 'Privacy']
/** Open the settings sheet from anywhere (the account menu, the profile page). */
export const openSettings = (tab: Tab = 'Display') => dispatchEvent(new CustomEvent('fw-settings', { detail: tab }))

const TRACKS: { id: TrackId; name: string; desc: string }[] = [
  { id: 'off', name: 'Off', desc: 'Just the game sounds.' },
  { id: 'matchday', name: 'Matchday', desc: 'Upbeat broadcast groove.' },
  { id: 'floodlights', name: 'Floodlights', desc: 'Slow, calm pads for long drafts.' },
  { id: 'terrace', name: 'Terrace', desc: 'Crowd noise, stomp, stomp, clap.' },
]

/** Per-device settings: display, sound, colours, privacy. Mounted once in main.tsx; the corner button and the account menu both open it. */
export default function QuickSettings() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('Display')

  useEffect(() => {
    const show = (e: Event) => { setTab((e as CustomEvent<Tab>).detail ?? 'Display'); setOpen(true) }
    addEventListener('fw-settings', show)
    return () => removeEventListener('fw-settings', show)
  }, [])

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
              <Seg id="qs-tab" options={TABS} value={tab} onChange={setTab} />
              {tab === 'Display' ? <DisplayPanel /> : tab === 'Sound' ? <SoundPanel /> : tab === 'Colours' ? <ColourLab /> : <PrivacyPanel />}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function Toggle({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc: string }) {
  return (
    <button className="toggle-row" role="switch" aria-checked={on} onClick={() => { onChange(!on); sfx.tick() }}>
      <span><b>{title}</b><span className="small dim">{desc}</span></span>
      <i className={`switch ${on ? 'on' : ''}`} aria-hidden />
    </button>
  )
}

function DisplayPanel() {
  const p = usePrefs()
  return (
    <div className="stack" style={{ gap: 12 }}>
      <Toggle on={p.effects} onChange={(effects) => setPrefs({ effects })} title="Stadium effects"
        desc="Camera flashes, drifting photos and frosted glass. Turn off if the game feels slow." />
      <Toggle on={p.motion === 'full'} onChange={(on) => setPrefs({ motion: on ? 'full' : 'reduced' })} title="Animations"
        desc="Slides, bounces and card flips. Off keeps simple fades only." />
      <Toggle on={p.tips} onChange={(tips) => setPrefs({ tips })} title="Kicko's tips"
        desc="A short tip the first time you open each screen. The ? button always shows them." />
      <button className="btn ghost" style={{ justifySelf: 'start', marginTop: 8 }} onClick={() => { resetOnboarding(); resetTips(); location.reload() }}>
        <Compass weight="bold" /> Replay the onboarding
      </button>
    </div>
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
        With your OK, The Final Whistle keeps anonymous usage stats: which screens are opened, which modes get finished, how long a visit lasts.
        It uses a random id for this browser. No names, emails or messages, and no ads. Saying no never blocks any part of the game.
      </p>
      <button className={`btn ${on ? '' : 'primary'}`} aria-pressed={on} onClick={() => { setTracking(!on); set(!on) }}>
        <ShieldCheck weight="bold" /> {on ? 'Usage stats are on. Turn off' : 'Usage stats are off. Turn on'}
      </button>
      <button className="btn ghost" onClick={resetConsent}><Cookie weight="bold" /> Show the cookie banner again</button>
      <p className="small">
        <button className="linkish" onClick={() => openLegal('Privacy')}>Privacy policy</button> · <button className="linkish" onClick={() => openLegal('Terms')}>Terms</button> · <button className="linkish" onClick={() => openLegal('Cookies')}>Cookies</button> · <button className="linkish" onClick={() => openLegal('Credits')}>Credits</button>
      </p>
      <p className="small dim">To delete everything, open your profile and choose "Delete my data".</p>
    </div>
  )
}
