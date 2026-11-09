// Renders a match or tournament result as a 1080x1350 PNG (Instagram portrait) in the current theme's colours.
import { APP_NAME } from './config'

export type ResultCard = {
  kicker: string // e.g. "Chaos Draft · Final"
  rows: { name: string; value: string; win?: boolean }[] // the scoreboard
  note?: string // "After penalties 4-3"
  lists?: { title: string; items: string[] }[] // scorers, other results
  star?: string // "Player of the match: Xavi 8.9"
}

const W = 1080, H = 1350, PAD = 84

function fit(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

export async function renderResultCard(card: ResultCard): Promise<Blob> {
  await document.fonts.ready
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  const ink = v('--ink') || '#090d0b', ink2 = v('--ink-3') || '#161e1a', chalk = v('--chalk') || '#e9eee4'
  const dim = v('--dim') || '#a1ada4', accent = v('--accent') || '#d2ef5b', accentInk = v('--accent-ink') || '#131a05'
  const display = '"Big Shoulders Display Variable", "Arial Narrow", sans-serif'
  const body = '"Onest Variable", system-ui, sans-serif'

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!

  // pitch-dark background with a floodlight glow and faint pitch stripes
  g.fillStyle = ink
  g.fillRect(0, 0, W, H)
  const glow = g.createRadialGradient(W * 0.85, -100, 0, W * 0.85, -100, 900)
  glow.addColorStop(0, accent + '33')
  glow.addColorStop(1, 'transparent')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)
  g.fillStyle = chalk + '05'
  for (let x = 0; x < W; x += 180) g.fillRect(x, 0, 90, H)

  // header
  g.fillStyle = chalk
  g.font = `900 52px ${display}`
  g.textBaseline = 'top'
  const [first, ...rest] = APP_NAME.toUpperCase().split(' ')
  g.fillText(first + ' ', PAD, PAD)
  g.fillStyle = accent
  g.fillText(rest.join(' '), PAD + g.measureText(first + ' ').width, PAD)
  g.fillStyle = dim
  g.font = `500 32px ${body}`
  g.fillText(card.kicker, PAD, PAD + 78)

  // scoreboard
  let y = 300
  for (const r of card.rows) {
    g.fillStyle = r.win ? accent : ink2
    g.beginPath()
    g.roundRect(PAD, y, W - PAD * 2, 150, 28)
    g.fill()
    g.fillStyle = r.win ? accentInk : chalk
    g.font = `800 88px ${display}`
    g.textBaseline = 'middle'
    const valueW = g.measureText(r.value).width
    g.fillText(fit(g, r.name.toUpperCase(), W - PAD * 2 - valueW - 110), PAD + 44, y + 80)
    g.textAlign = 'right'
    g.fillText(r.value, W - PAD - 44, y + 80)
    g.textAlign = 'left'
    y += 170
  }
  if (card.note) {
    g.fillStyle = dim
    g.font = `600 34px ${body}`
    g.textBaseline = 'top'
    g.fillText(card.note, PAD, y + 4)
    y += 60
  }

  // details
  y += 30
  g.textBaseline = 'top'
  const cols = card.lists?.slice(0, 2) ?? []
  const colW = (W - PAD * 2 - 40) / Math.max(cols.length, 1)
  cols.forEach((l, i) => {
    const x = PAD + i * (colW + 40)
    g.fillStyle = dim
    g.font = `600 28px ${body}`
    g.fillText(fit(g, l.title, colW), x, y)
    g.fillStyle = chalk
    g.font = `500 32px ${body}`
    l.items.slice(0, 6).forEach((it, k) => g.fillText(fit(g, it, colW), x, y + 50 + k * 48))
    if (l.items.length > 6) { g.fillStyle = dim; g.fillText(`+${l.items.length - 6} more`, x, y + 50 + 6 * 48) }
  })

  // footer
  if (card.star) {
    g.fillStyle = accent
    g.font = `800 44px ${display}`
    g.fillText(fit(g, card.star.toUpperCase(), W - PAD * 2), PAD, H - PAD - 120)
  }
  g.fillStyle = dim
  g.font = `500 28px ${body}`
  g.fillText(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), PAD, H - PAD - 34)

  return new Promise((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Could not draw the card'))), 'image/png'))
}

export const cardText = (card: ResultCard) =>
  [`${APP_NAME} · ${card.kicker}`, ...card.rows.map((r) => `${r.name} ${r.value}`), card.note, card.star].filter(Boolean).join('\n')
