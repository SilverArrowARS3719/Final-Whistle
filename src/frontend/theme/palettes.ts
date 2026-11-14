// Colour lab: each palette is three brand colours; deriveTheme() turns them into the app's tokens.
// The app is dark-only, so the colour picked as `bg` is pulled down to a deep shade of its hue, and the
// text and accent colours are lifted just enough to stay readable on it.

export type Swatch = { name: string; hex: string }
type Role = 0 | 1 | 2
export type Palette = {
  id: string
  name: string
  colors: [Swatch, Swatch, Swatch]
  bg: Role // becomes the page background (darkened)
  text: Role // becomes body text (lightened)
  accent: Role // becomes the action colour
  glow?: Role // tints the backdrop; defaults to the bg colour
}

const S = (name: string, hex: string): Swatch => ({ name, hex })
export const PALETTES: Palette[] = [
  { id: 'petrol-lime', name: 'Petrol Lime', colors: [S('Petrol Blue', '#0e4f63'), S('Ice White', '#eaf7fb'), S('Signal Lime', '#c8f31d')], bg: 0, text: 1, accent: 2 },
  { id: 'arcade-gum', name: 'Arcade Gum', colors: [S('Pool Blue', '#29c5f6'), S('Arcade Ink', '#14123a'), S('Bubble Gum', '#ff6fb5')], bg: 1, text: 0, accent: 2, glow: 0 },
  { id: 'dawn-cherry', name: 'Dawn Cherry', colors: [S('Dawn Rose', '#e8a0b4'), S('Black Cherry', '#2b0a17'), S('First Light', '#ffe3b3')], bg: 1, text: 2, accent: 0 },
  { id: 'sky-vermilion', name: 'Sky Vermilion', colors: [S('Sky Blue', '#5bb8f0'), S('Cloud White', '#f2f6fa'), S('Vermilion', '#ff4d2e')], bg: 0, text: 1, accent: 2 },
  { id: 'red-acid', name: 'Red Acid', colors: [S('Red Orange', '#ff4a1c'), S('Snow White', '#fbfbf8'), S('Acid Yellow', '#e4ff2a')], bg: 0, text: 1, accent: 2 },
  { id: 'sapphire-jade', name: 'Sapphire Jade', colors: [S('Sapphire Blue', '#0f3dbd'), S('Ocean Cyan', '#19b8d6'), S('Neon Jade', '#2dffa0')], bg: 0, text: 1, accent: 2, glow: 1 },
  { id: 'butter-candy', name: 'Butter Candy', colors: [S('Butter Yellow', '#ffe27a'), S('Aubergine', '#3a1136'), S('Candy Pink', '#ff7ac1')], bg: 1, text: 0, accent: 2 },
  { id: 'sand-cobalt', name: 'Sand Cobalt', colors: [S('Warm Sand', '#e6d3b3'), S('Espresso', '#2a1810'), S('Cobalt Blue', '#1f4fe0')], bg: 1, text: 0, accent: 2, glow: 2 },
  { id: 'haze-citron', name: 'Haze Citron', colors: [S('Haze Lavender', '#b9a8ea'), S('Black Plum', '#1f0b26'), S('Acid Citron', '#d6ff3a')], bg: 1, text: 0, accent: 2, glow: 0 },
  { id: 'mandarin-forest', name: 'Mandarin Forest', colors: [S('Mandarin Orange', '#ff8a1f'), S('Forest Green', '#12432b'), S('Crest Yellow', '#ffd23a')], bg: 1, text: 2, accent: 0 },
  { id: 'onyx-mint', name: 'Onyx Mint', colors: [S('Onyx Black', '#0b0b0f'), S('Electric Indigo', '#5a3cff'), S('Tropical Mint', '#5dffc7')], bg: 0, text: 1, accent: 2, glow: 1 },
  { id: 'teal-crimson', name: 'Teal Crimson', colors: [S('Teal Blue', '#0e7c86'), S('Navy Blue', '#0b1f4d'), S('Crimson Pink', '#ff2d6f')], bg: 1, text: 0, accent: 2, glow: 0 },
  { id: 'sugar-cherry', name: 'Sugar Cherry', colors: [S('Sugar Violet', '#b79cff'), S('Vanilla Cream', '#fff1d0'), S('Cherry Red', '#e0183c')], bg: 0, text: 1, accent: 2 },
  { id: 'pool-solar', name: 'Pool Solar', colors: [S('Pool Blue', '#29c5f6'), S('Dark Cocoa', '#2a1a14'), S('Solar Yellow', '#ffc712')], bg: 1, text: 0, accent: 2, glow: 0 },
  { id: 'porcelain-ultramarine', name: 'Porcelain Ultramarine', colors: [S('Porcelain', '#f4f1ec'), S('Carbon', '#16181b'), S('Ultramarine', '#2b3cff')], bg: 1, text: 0, accent: 2, glow: 2 },
  { id: 'lemon-pink', name: 'Lemon Pink', colors: [S('Lemon Yellow', '#fff04a'), S('Cobalt Blue', '#1b3fe6'), S('Hot Pink', '#ff2e93')], bg: 1, text: 0, accent: 2 },
  { id: 'ice-vermilion', name: 'Ice Vermilion', colors: [S('Ice Blue', '#cfe9f7'), S('Midnight Ink', '#0a1030'), S('Vermilion', '#ff4d2e')], bg: 1, text: 0, accent: 2 },
  { id: 'forest-coral', name: 'Forest Coral', colors: [S('Forest Green', '#14452b'), S('Ivory', '#f6f1e1'), S('Coral', '#ff7a5c')], bg: 0, text: 1, accent: 2 },
]
/** The shipped look. It applies nothing: the defaults in index.css are the source of truth. */
export const DEFAULT_ID = 'floodlight'

// ---------- colour maths ----------
type RGB = [number, number, number]
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB
const WHITE: RGB = [255, 255, 255]
const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const luminance = (c: RGB) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
export function contrast(a: RGB | string, b: RGB | string) {
  const x = luminance(typeof a === 'string' ? toRgb(a) : a)
  const y = luminance(typeof b === 'string' ? toRgb(b) : b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

function hsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}
function fromHsl(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

/** Mix toward white until `c` reaches `min` contrast on `on`. */
function lift(c: RGB, on: RGB, min: number): RGB {
  for (let t = 0; t <= 1; t += 0.04) {
    const out = mix(c, WHITE, t)
    if (contrast(out, on) >= min) return out
  }
  return WHITE
}
/** The least text colour (mixed from `text` into `bg`) that still reaches `min` contrast. */
function fade(text: RGB, bg: RGB, min: number): RGB {
  for (let t = 0.3; t <= 1; t += 0.02) {
    const out = mix(bg, text, t)
    if (contrast(out, bg) >= min) return out
  }
  return text
}

export type Tokens = Record<string, string>
export function deriveTheme(p: Palette): Tokens & { _bg: string; _text: string; _accent: string } {
  const pick = (r: Role) => toRgb(p.colors[r].hex)
  const [h, s] = hsl(pick(p.bg))
  const bg = fromHsl(h, Math.min(Math.max(s, 0.18), 0.55), 0.065)
  const text = lift(pick(p.text), bg, 12)
  const accent = lift(pick(p.accent), bg, 4.5)
  const darkInk = mix(bg, [0, 0, 0], 0.4)
  const accentInk = contrast(accent, darkInk) >= 4.5 ? darkInk : WHITE
  const space = (c: RGB) => c.map((v) => Math.round(v)).join(' ')
  return {
    '--ink': toHex(bg),
    '--ink-2': toHex(mix(bg, text, 0.035)),
    '--ink-3': toHex(mix(bg, text, 0.07)),
    '--ink-4': toHex(mix(bg, text, 0.11)),
    '--chalk': toHex(text),
    '--dim': toHex(fade(text, bg, 7)),
    '--faint': toHex(fade(text, bg, 4.6)),
    '--accent': toHex(accent),
    '--accent-ink': toHex(accentInk),
    '--ink-rgb': space(bg),
    '--chalk-rgb': space(text),
    '--accent-rgb': space(accent),
    '--glow-rgb': space(pick(p.glow ?? p.bg)),
    _bg: toHex(bg), _text: toHex(text), _accent: toHex(accent),
  }
}

const KEY = 'fw-theme'
const OWNED = ['--ink', '--ink-2', '--ink-3', '--ink-4', '--chalk', '--dim', '--faint', '--accent', '--accent-ink', '--ink-rgb', '--chalk-rgb', '--accent-rgb', '--glow-rgb']

export function applyTheme(id: string) {
  const root = document.documentElement.style
  OWNED.forEach((k) => root.removeProperty(k))
  const p = PALETTES.find((x) => x.id === id)
  if (p) {
    const t = deriveTheme(p)
    OWNED.forEach((k) => root.setProperty(k, t[k]))
  }
  try { localStorage.setItem(KEY, p ? id : DEFAULT_ID) } catch { /* private mode: the choice just doesn't persist */ }
}
export function savedTheme() {
  try { return localStorage.getItem(KEY) ?? DEFAULT_ID } catch { return DEFAULT_ID }
}
