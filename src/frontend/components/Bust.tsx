import type { Player } from '../../game/data/players'
import { LOOKS, type Look } from '../../game/data/appearance'

// Stylised 3D avatar built from each player's real prime look (skin tone, hair, facial hair).
const SKIN = ['#f3d6c1', '#e2b590', '#c99063', '#a46a43', '#77492c', '#4c2d1c']
const HAIR: Record<string, string> = { b: '#16110e', d: '#3b2717', n: '#6e4629', l: '#d9b468', r: '#b4562a', g: '#a3a39e' }
const KITS = ['#c8312f', '#1f4fa8', '#f2f2ee', '#1d1d1f', '#e7c13a', '#2f8f5b', '#7b2d8b', '#e2602b', '#5fa8e0', '#8c1d2f']
const NUMBERS: Record<string, number[]> = {
  GK: [1, 12, 13], CB: [4, 5, 3, 15], LB: [3, 12], RB: [2, 22], LWB: [3, 21], RWB: [2, 24],
  CDM: [6, 16, 5], CM: [8, 14, 6], LM: [11, 17], RM: [7, 18], CAM: [10, 20, 8], LW: [11, 7], RW: [7, 11, 17], ST: [9, 19, 10],
}
const DEFAULT: Look = { skin: 2, style: 's', color: 'd', facial: 'n', face: 'o' }

// Head outlines per face shape. All share the crown (top ~19) so hair layers still fit.
const HEADS: Record<string, string> = {
  o: 'M50 19 C61 19 67 27 67 39 C67 50 62 57.5 56.5 60.5 C53.5 62.3 46.5 62.3 43.5 60.5 C38 57.5 33 50 33 39 C33 27 39 19 50 19 Z',
  s: 'M50 19 C61.5 19 68 26 68 37 C68 45 68 51 66 55.5 C63.5 60.5 57 62.5 50 62.5 C43 62.5 36.5 60.5 34 55.5 C32 51 32 45 32 37 C32 26 38.5 19 50 19 Z',
  n: 'M50 17.5 C58.8 17.5 64 25 64 37 C64 50 60.5 59 55.5 64 C53 66 47 66 44.5 64 C39.5 59 36 50 36 37 C36 25 41.2 17.5 50 17.5 Z',
  r: 'M50 20 C63 20 69 28.5 69 40.5 C69 52 62 59.5 50 59.8 C38 59.5 31 52 31 40.5 C31 28.5 37 20 50 20 Z',
  v: 'M50 19 C61 19 67 27 67 37.5 C67 46.5 62 55 55 61 C52.5 63.2 47.5 63.2 45 61 C38 55 33 46.5 33 37.5 C33 27 39 19 50 19 Z',
}
// Per shape: jaw-corner shadow (x offset from centre, y), chin y, ear x offset.
const JAW: Record<string, [number, number, number, number]> = {
  o: [14, 54, 62, 17.2], s: [16, 56, 62.5, 18.2], n: [12, 57, 66, 14.6], r: [16, 52, 59.8, 18.6], v: [13, 52, 63, 17.2],
}

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)
function mix(hex: string, to: string, t: number) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16)
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`
}

// Hair layers: `back` sits behind the head, `front` on top of it. Head is an ellipse at (50,40) r 17x21.
const CAP_SHORT = 'M32.5 38 C31 21 41 16 50 16 C59 16 69 21 67.5 38 C65 29 58 25 50 25 C42 25 35 29 32.5 38 Z'
const CAP_BUZZ = 'M33.5 36 C33 22 41 18.5 50 18.5 C59 18.5 67 22 66.5 36 C63 29 57 26.5 50 26.5 C43 26.5 37 29 33.5 36 Z'
const STYLES: Record<string, { back?: string; front?: string; buzz?: boolean; curls?: boolean; bun?: boolean; strands?: boolean }> = {
  x: {},
  z: { front: CAP_BUZZ, buzz: true },
  s: { front: CAP_SHORT },
  f: { front: 'M32 38 C30 20 41 15 51 15 C61 15 70 21 68 37 C64 30 60 30 56 31 C50 32 44 30 40 33 C37 34 34 36 32 38 Z' },
  w: { back: 'M29 50 C26 30 36 14 50 14 C64 14 74 30 71 50 Z', front: 'M30 44 C28 25 38 14 50 14 C62 14 72 25 70 44 C68 34 64 28 58 26 C52 25 46 25 41 27 C35 30 32 36 30 44 Z' },
  l: { back: 'M27 70 C22 42 30 13 50 13 C70 13 78 42 73 70 C66 74 34 74 27 70 Z', front: 'M31 42 C29 22 39 13 50 13 C61 13 71 22 69 42 C67 31 61 25 50 24.5 C39 25 33 31 31 42 Z' },
  c: { curls: true },
  a: { back: 'M24 36 C24 14 38 6 50 6 C62 6 76 14 76 36 C76 48 70 52 66 52 L34 52 C30 52 24 48 24 36 Z', curls: true },
  d: { front: CAP_SHORT, strands: true },
  m: { front: 'M39.5 27 C39 15 45 10 50 10 C55 10 61 15 60.5 27 C56 25 44 25 39.5 27 Z', buzz: true },
  p: { front: 'M32.5 37 C31 20 41 15.5 50 15.5 C59 15.5 69 20 67.5 37 C65 27 58 23.5 50 23.5 C42 23.5 35 27 32.5 37 Z', bun: true },
  k: { front: 'M32.5 36 C31 19 41 14.5 50 14.5 C60 14.5 69 19 67.5 36 C66 28 60 22 50 22.5 C44 22.5 38 26 32.5 36 Z' },
}

export default function Bust({ p }: { p: Player }) {
  const look = LOOKS[p.name] ?? DEFAULT
  const h = hash(p.name)
  const skin = SKIN[look.skin - 1] ?? SKIN[1]
  const hair = HAIR[look.color] ?? HAIR.d
  const st = STYLES[look.style] ?? STYLES.s
  const kit = KITS[hash(p.clubs[0] ?? p.nation) % KITS.length] // national-team-only players have no club
  const nums = NUMBERS[p.positions[0]] ?? [10]
  const num = nums[h % nums.length]
  const id = `b${p.id}`
  const darkKitText = ['#f2f2ee', '#e7c13a', '#5fa8e0'].includes(kit)
  const head = HEADS[look.face] ?? HEADS.o
  const [jx, jy, headBottom, ear] = JAW[look.face] ?? JAW.o
  const shade = mix(skin, '#000000', 0.5)
  const brow = look.color === 'l' || look.color === 'g' ? mix(hair, '#000000', 0.35) : hair

  return (
    <svg viewBox="0 0 100 100" className="bust" aria-hidden>
      <defs>
        <radialGradient id={`${id}f`} cx="40%" cy="32%" r="72%">
          <stop offset="0" stopColor={mix(skin, '#ffffff', 0.28)} />
          <stop offset="0.55" stopColor={skin} />
          <stop offset="1" stopColor={mix(skin, '#000000', 0.45)} />
        </radialGradient>
        <radialGradient id={`${id}h`} cx="40%" cy="25%" r="80%">
          <stop offset="0" stopColor={mix(hair, '#ffffff', 0.25)} />
          <stop offset="0.5" stopColor={hair} />
          <stop offset="1" stopColor={mix(hair, '#000000', 0.5)} />
        </radialGradient>
        <linearGradient id={`${id}k`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={kit} />
          <stop offset="1" stopColor="#050706" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id={`${id}c`}><path d={head} /></clipPath>
        <radialGradient id={`${id}s`}>
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="50" cy="97" rx="40" ry="5" fill={`url(#${id}s)`} />
      {st.back && <path d={st.back} fill={`url(#${id}h)`} />}

      {/* shoulders + kit */}
      <path d="M8 100 C9 80 24 71 50 71 C76 71 91 80 92 100 Z" fill={`url(#${id}k)`} />
      <path d="M40 71 L50 82 L60 71" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="2.5" />
      <text x="50" y="96" textAnchor="middle" fontFamily="var(--display)" fontWeight="900" fontSize="13" fill={darkKitText ? '#111' : '#f4f4ef'} opacity="0.9">{num}</text>

      {/* neck with shadow under the jaw */}
      <path d="M42 54 L42 72 C46 76 54 76 58 72 L58 54 Z" fill={mix(skin, '#000000', 0.18)} />
      <ellipse cx="50" cy={headBottom - 0.5} rx="9" ry="4" fill="#000" opacity="0.35" />
      <ellipse cx={50 - ear} cy="43" rx="3.2" ry="5.2" fill={`url(#${id}f)`} />
      <ellipse cx={50 + ear} cy="43" rx="3.2" ry="5.2" fill={`url(#${id}f)`} />
      <path d={head} fill={`url(#${id}f)`} />

      <g clipPath={`url(#${id}c)`}>
        {/* bone structure: jaw corners, hollows under the cheekbones, chin and cheekbone highlights */}
        <ellipse cx={50 - jx} cy={jy} rx="4" ry="6.5" fill={shade} opacity="0.24" transform={`rotate(-18 ${50 - jx} ${jy})`} />
        <ellipse cx={50 + jx} cy={jy} rx="4" ry="6.5" fill={shade} opacity="0.24" transform={`rotate(18 ${50 + jx} ${jy})`} />
        <ellipse cx="38.5" cy="48" rx="2.2" ry="4.2" fill={shade} opacity="0.1" />
        <ellipse cx="61.5" cy="48" rx="2.2" ry="4.2" fill={shade} opacity="0.1" />
        <ellipse cx="41" cy="42.5" rx="3.6" ry="1.6" fill="#fff" opacity="0.14" />
        <ellipse cx="59" cy="42.5" rx="3.6" ry="1.6" fill="#fff" opacity="0.1" />
        <ellipse cx="50" cy={headBottom - 3.2} rx="3.2" ry="1.6" fill="#fff" opacity="0.16" />
        {/* facial hair, clipped so it follows this player's jawline */}
        {(look.facial === 's' || look.facial === 'b') && (
          <path
            d="M28 43 L33 43 C35 51 39 54 44 53 C47 52.3 53 52.3 56 53 C61 54 65 51 67 43 L72 43 L72 70 L28 70 Z"
            fill={hair}
            opacity={look.facial === 'b' ? 0.92 : 0.3}
          />
        )}
      </g>
      {/* crisp jawline contour */}
      <path d={head} fill="none" stroke={mix(skin, '#000000', 0.55)} strokeWidth="1" opacity="0.85" />

      {/* face: brows, eyes, nose, mouth */}
      <path d="M40.5 36.4 Q44 34.2 47.3 35.8 M52.7 35.8 Q56 34.2 59.5 36.4" stroke={brow} strokeWidth="1.9" fill="none" strokeLinecap="round" />
      <path d="M41.6 40.6 Q44 38.9 46.4 40.6" stroke={shade} strokeWidth="0.7" fill="none" opacity="0.6" />
      <path d="M53.6 40.6 Q56 38.9 58.4 40.6" stroke={shade} strokeWidth="0.7" fill="none" opacity="0.6" />
      <ellipse cx="44" cy="41.2" rx="1.6" ry="1.7" fill="#1a1210" />
      <ellipse cx="56" cy="41.2" rx="1.6" ry="1.7" fill="#1a1210" />
      <circle cx="44.6" cy="40.6" r="0.5" fill="#fff" opacity="0.8" />
      <circle cx="56.6" cy="40.6" r="0.5" fill="#fff" opacity="0.8" />
      {/* nose: bridge highlight, side shadow, nostrils */}
      <path d="M50.4 39 L50.4 46" stroke="#fff" strokeWidth="1" opacity="0.18" strokeLinecap="round" />
      <path d="M49 39.5 C48.6 43 47.6 45.5 47.2 47.2" stroke={shade} strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M46.8 47.6 Q48 49.2 50 48.8 Q52 49.2 53.2 47.6" stroke={shade} strokeWidth="1" fill="none" opacity="0.65" strokeLinecap="round" />
      {(look.facial === 'm' || look.facial === 'b') && (
        <path d="M44 51 C46 49.3 48.5 49.5 50 50.5 C51.5 49.5 54 49.3 56 51 C54 52.1 46 52.1 44 51 Z" fill={hair} />
      )}
      {/* lips */}
      <path d="M46 53.2 Q48 52.2 50 52.8 Q52 52.2 54 53.2 Q50 54 46 53.2 Z" fill={mix(skin, '#5a1f1a', 0.45)} />
      <path d="M46.6 53.4 Q50 56.2 53.4 53.4 Q50 54.4 46.6 53.4 Z" fill={mix(skin, '#5a1f1a', 0.3)} />
      <path d="M48 57.2 Q50 58 52 57.2" stroke={shade} strokeWidth="0.8" fill="none" opacity="0.4" strokeLinecap="round" />

      {/* hair on top */}
      {st.front && <path d={st.front} fill={`url(#${id}h)`} opacity={st.buzz ? 0.82 : 1} />}
      {st.buzz && st.front !== CAP_BUZZ && <path d={CAP_BUZZ} fill={hair} opacity="0.45" />}
      {st.curls &&
        [[36, 30, 5], [41, 23, 5.5], [48, 19.5, 5.5], [55, 20, 5.5], [61, 24, 5.5], [65, 31, 4.5], [34, 37, 3.5], [66, 37, 3.5], [45, 27, 4], [55, 27, 4]].map(
          ([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#${id}h)`} />,
        )}
      {st.bun && <circle cx="50" cy="13" r="6" fill={`url(#${id}h)`} />}
      {st.strands &&
        [33, 37, 41, 59, 63, 67].map((x, i) => (
          <path key={i} d={`M${x} 30 Q${x + (x < 50 ? -2 : 2)} 44 ${x + (x < 50 ? -1 : 1)} 56`} stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none" />
        ))}
    </svg>
  )
}
