// Tiny synthesised sound effects (no audio files). Silently does nothing where audio is unavailable.
let ctx: AudioContext | null = null
function tone(freq: number, start: number, dur: number, type: OscillatorType, gain = 0.2, slideTo?: number) {
  try {
    ctx ??= new AudioContext()
    const t = ctx.currentTime + start
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur)
  } catch {
    // audio blocked or unsupported: the visuals still play
  }
}
export const sfx = {
  bust: () => { tone(160, 0, 0.6, 'sawtooth', 0.25, 60); tone(110, 0.15, 0.7, 'square', 0.12, 50) },
  perfect: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.5, 'triangle', 0.18)),
  tick: () => tone(1800, 0, 0.03, 'square', 0.04),
  flip: () => tone(900, 0, 0.12, 'triangle', 0.08, 1400),
  sold: () => { tone(700, 0, 0.12, 'square', 0.1); tone(1050, 0.12, 0.3, 'square', 0.1) },
}
