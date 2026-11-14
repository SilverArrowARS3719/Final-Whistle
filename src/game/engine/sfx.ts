// Synthesised sound (no audio files): effects, three music loops and a mixer the player controls.
// Silently does nothing where audio is unavailable.

export type TrackId = 'off' | 'matchday' | 'floodlights' | 'terrace'
export type SoundSettings = { muted: boolean; effects: number; music: number; track: TrackId }
const KEY = 'fw-sound'
const DEFAULTS: SoundSettings = { muted: false, effects: 0.8, music: 0.5, track: 'off' }

export function loadSound(): SoundSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULTS }
}
let settings = loadSound()

let ctx: AudioContext | null = null
let fxBus: GainNode, musicBus: GainNode, noise: AudioBuffer
function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    fxBus = ctx.createGain()
    musicBus = ctx.createGain()
    fxBus.connect(ctx.destination)
    musicBus.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    applyLevels()
    // don't play to a hidden tab
    document.addEventListener('visibilitychange', () => (document.hidden ? ctx!.suspend() : ctx!.resume()))
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume()
  return ctx
}
function applyLevels() {
  if (!ctx) return
  const t = ctx.currentTime
  fxBus.gain.setTargetAtTime(settings.muted ? 0 : settings.effects, t, 0.02)
  musicBus.gain.setTargetAtTime(settings.muted ? 0 : settings.music * 0.6, t, 0.05)
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain = 0.2, slideTo?: number, bus?: AudioNode) {
  try {
    const c = audio()
    const t = c.currentTime + start
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(bus ?? fxBus)
    o.start(t)
    o.stop(t + dur)
  } catch {
    // audio blocked or unsupported: the visuals still play
  }
}
/** Filtered noise burst: crowd, claps, hats. `at` is an absolute AudioContext time. */
function hiss(at: number, dur: number, gain: number, freq: number, q: number, bus: AudioNode, attack = 0.005) {
  const c = ctx!
  const s = c.createBufferSource()
  s.buffer = noise
  s.loop = dur > 2
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  s.connect(f).connect(g).connect(bus)
  s.start(at, Math.random() * 1.5)
  s.stop(at + dur + 0.05)
}

export const sfx = {
  bust: () => { tone(160, 0, 0.6, 'sawtooth', 0.25, 60); tone(110, 0.15, 0.7, 'square', 0.12, 50) },
  perfect: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.5, 'triangle', 0.18)),
  tick: () => tone(1800, 0, 0.03, 'square', 0.04),
  flip: () => tone(900, 0, 0.12, 'triangle', 0.08, 1400),
  sold: () => { tone(700, 0, 0.12, 'square', 0.1); tone(1050, 0.12, 0.3, 'square', 0.1) },
  pick: () => { tone(520, 0, 0.08, 'triangle', 0.12); tone(780, 0.06, 0.16, 'triangle', 0.1) },
  whistle: (long = false) => { tone(2900, 0, long ? 0.9 : 0.35, 'sine', 0.12, 2750); tone(3100, 0, long ? 0.9 : 0.35, 'sine', 0.05) },
  goal: () => {
    try {
      const c = audio()
      hiss(c.currentTime, 2.6, 0.5, 900, 0.6, fxBus, 0.25) // the crowd
      hiss(c.currentTime + 0.1, 2.2, 0.25, 2400, 0.8, fxBus, 0.3)
    } catch { /* no audio */ }
    ;[392, 523, 659].forEach((f, i) => tone(f, 0.05 + i * 0.09, 0.6, 'square', 0.06))
  },
  react: () => tone(1250, 0, 0.09, 'sine', 0.08, 1700),
}

// ---------- music ----------
const A = (n: number) => 440 * 2 ** ((n - 69) / 12) // MIDI note to Hz
type Track = { bpm: number; step: (s: number, t: number) => void; start?: () => void; stop?: () => void }
// Am – F – C – G, one chord per bar of 16 sixteenths
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]

function kick(t: number, g = 0.9) {
  const c = ctx!, o = c.createOscillator(), v = c.createGain()
  o.frequency.setValueAtTime(130, t)
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18)
  v.gain.setValueAtTime(g, t)
  v.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  o.connect(v).connect(musicBus)
  o.start(t); o.stop(t + 0.4)
}
function note(midi: number, t: number, dur: number, type: OscillatorType, g: number, attack = 0.01) {
  const c = ctx!, o = c.createOscillator(), v = c.createGain()
  o.type = type
  o.frequency.value = A(midi)
  v.gain.setValueAtTime(0.0001, t)
  v.gain.exponentialRampToValueAtTime(g, t + attack)
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(v).connect(musicBus)
  o.start(t); o.stop(t + dur + 0.05)
}

let crowd: { src: AudioBufferSourceNode; lfo: OscillatorNode } | null = null
const TRACKS: Record<Exclude<TrackId, 'off'>, Track> = {
  // upbeat broadcast-intro groove
  matchday: {
    bpm: 116,
    step: (s, t) => {
      const i = s % 16, chord = PROG[Math.floor(s / 16) % 4]
      if (i % 4 === 0) kick(t, 0.7)
      if (i === 4 || i === 12) hiss(t, 0.16, 0.35, 1800, 0.7, musicBus)
      if (i % 2 === 1) hiss(t, 0.05, 0.08, 8000, 1, musicBus)
      if (i % 4 === 2) note(chord[0] - 12, t, 0.22, 'triangle', 0.32)
      if (i === 6 || i === 14) chord.forEach((m) => note(m + 12, t, 0.18, 'square', 0.025))
      if (Math.floor(s / 16) % 2 === 1 && [0, 3, 6, 10].includes(i)) note(chord[[0, 1, 2, 1][[0, 3, 6, 10].indexOf(i)]] + 24, t, 0.25, 'triangle', 0.06)
    },
  },
  // slow pads under the lights
  floodlights: {
    bpm: 72,
    step: (s, t) => {
      const i = s % 32, chord = PROG[Math.floor(s / 32) % 4]
      if (i === 0) { chord.forEach((m) => note(m, t, 6.4, 'sine', 0.07, 1.6)); note(chord[0] - 24, t, 6.4, 'sine', 0.12, 0.8) }
      if (i % 8 === 4) note(chord[(s >> 3) % 3] + 12, t, 1.6, 'triangle', 0.035, 0.05)
    },
  },
  // a terrace: crowd bed, stomp-stomp-clap
  terrace: {
    bpm: 96,
    start: () => {
      const c = ctx!, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), depth = c.createGain()
      src.buffer = noise; src.loop = true
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5
      g.gain.value = 0.16
      lfo.frequency.value = 0.12; depth.gain.value = 0.08
      lfo.connect(depth).connect(g.gain)
      src.connect(f).connect(g).connect(musicBus)
      src.start(); lfo.start()
      crowd = { src, lfo }
    },
    stop: () => { crowd?.src.stop(); crowd?.lfo.stop(); crowd = null },
    step: (s, t) => {
      const i = s % 16
      if (i === 0 || i === 4) kick(t, 0.55)
      if (i === 8) hiss(t, 0.2, 0.4, 1500, 0.6, musicBus)
      if (i === 12 && (s >> 4) % 4 === 3) [0, 2].forEach((k) => hiss(t + k * 0.08, 0.15, 0.3, 1500, 0.6, musicBus))
    },
  },
}

let timer: ReturnType<typeof setInterval> | null = null
let playing: TrackId = 'off'
function stopMusic() {
  if (timer) clearInterval(timer)
  timer = null
  if (playing !== 'off') TRACKS[playing].stop?.()
  playing = 'off'
}
function startMusic(id: TrackId) {
  stopMusic()
  if (id === 'off') return
  try {
    const c = audio(), tr = TRACKS[id], dt = 60 / tr.bpm / 4
    let step = 0, next = c.currentTime + 0.1
    tr.start?.()
    playing = id
    // look-ahead scheduler: precise timing from the audio clock, setInterval only tops up the queue
    timer = setInterval(() => {
      while (next < c.currentTime + 0.25) { tr.step(step++, next); next += dt }
    }, 60)
  } catch { /* no audio */ }
}

export function setSound(next: Partial<SoundSettings>) {
  const trackChanged = next.track !== undefined && next.track !== settings.track
  settings = { ...settings, ...next }
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* not persisted */ }
  applyLevels()
  if (trackChanged || (next.track && playing === 'off')) startMusic(settings.track)
  return settings
}

// Browsers only allow sound after a gesture: resume the saved track on the first tap.
if (typeof window !== 'undefined' && settings.track !== 'off') {
  window.addEventListener('pointerdown', () => { if (playing === 'off' && settings.track !== 'off') startMusic(settings.track) }, { once: true })
}
