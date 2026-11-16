// Password rules for new accounts, a strength score for the meter, and a generator for a strong suggestion.
// The server (Supabase) still does its own checks; this is the first line, and the one people see.

// The most-used passwords and the obvious football ones. Checked after stripping case, digits and symbols
// from the ends, so "Password123!" and "Football2026" are caught too.
const COMMON = new Set([
  'password', 'passw0rd', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbnm', 'letmein', 'welcome', 'admin', 'login', 'iloveyou',
  'monkey', 'dragon', 'master', 'sunshine', 'princess', 'shadow', 'superman', 'batman', 'trustno', 'starwars', 'whatever', 'freedom',
  'baseball', 'basketball', 'football', 'soccer', 'hockey', 'jordan', 'michael', 'charlie', 'thomas', 'hunter', 'ranger', 'buster',
  'secret', 'changeme', 'default', 'abc', 'abcdef', 'abcdefg', 'abcdefgh', 'qazwsx', 'zaq', 'pokemon', 'minecraft', 'fortnite', 'roblox',
  'liverpool', 'arsenal', 'chelsea', 'manutd', 'manchester', 'barcelona', 'realmadrid', 'juventus', 'messi', 'ronaldo', 'neymar',
  'mbappe', 'haaland', 'cristiano', 'goal', 'goals', 'striker', 'draftroom', 'thedraftroom', 'finalwhistle', 'thefinalwhistle', 'computer', 'internet',
  'google', 'apple', 'samsung', 'hello', 'helloworld', 'test', 'tester', 'guest', 'user', 'root', 'love', 'lovely', 'family', 'summer',
  'winter', 'spring', 'autumn', 'january', 'friday', 'flower', 'cookie', 'chocolate', 'banana', 'orange', 'purple', 'pepper', 'ginger',
])

export type Rule = { id: string; label: string; ok: boolean }

const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const hasRun = (pw: string) => {
  const low = pw.toLowerCase()
  for (let i = 0; i + 3 <= low.length; i++) {
    const tri = low.slice(i, i + 3)
    if (tri[0] === tri[1] && tri[1] === tri[2]) return true // "aaa", "111"
    if (SEQUENCES.some((s) => s.includes(tri) || s.split('').reverse().join('').includes(tri))) return true // "abc", "321"
  }
  return false
}

/** True when the password is (or is built around) a well-known one. */
export function isCommon(pw: string) {
  const core = pw.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '').replace(/[@4]/g, 'a').replace(/0/g, 'o').replace(/[1!]/g, 'i').replace(/3/g, 'e').replace(/[$5]/g, 's')
  if (!core) return /^\d+$/.test(pw) // digits only, like 12345678
  return COMMON.has(core) || [...COMMON].some((w) => w.length >= 5 && core.includes(w))
}

export function rules(pw: string, email = ''): Rule[] {
  const name = email.split('@')[0].toLowerCase()
  return [
    { id: 'len', label: '12+ characters', ok: pw.length >= 12 },
    { id: 'case', label: 'Upper and lower case', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { id: 'digit', label: 'A number', ok: /\d/.test(pw) },
    { id: 'symbol', label: 'A symbol', ok: /[^A-Za-z0-9]/.test(pw) },
    { id: 'common', label: 'Not a common password', ok: pw.length > 0 && !isCommon(pw) },
    { id: 'pattern', label: 'No runs like aaa or 123', ok: pw.length > 0 && !hasRun(pw) },
    { id: 'email', label: "Doesn't contain your email", ok: pw.length > 0 && (name.length < 3 || !pw.toLowerCase().includes(name)) },
  ]
}

export const passes = (pw: string, email = '') => rules(pw, email).every((r) => r.ok)

/** 0 to 1 for the meter: the rules met, plus a little extra for length beyond the minimum. */
export function strength(pw: string, email = '') {
  if (!pw) return 0
  const rs = rules(pw, email)
  const met = rs.filter((r) => r.ok).length / rs.length
  const allOk = met === 1
  const extra = Math.min(1, Math.max(0, pw.length - 12) / 8)
  return allOk ? 0.85 + 0.15 * extra : Math.min(0.8, met * 0.8)
}
export const strengthWord = (s: number) => (s === 0 ? '' : s < 0.4 ? 'Weak' : s < 0.8 ? 'Getting there' : s < 0.95 ? 'Strong' : 'Very strong')

const WORDS = [
  'Volley', 'Libero', 'Panenka', 'Rabona', 'Nutmeg', 'Regista', 'Rondo', 'Mezzala', 'Poacher', 'Sweeper', 'Stopper', 'Trivela',
  'Chip', 'Header', 'Treble', 'Derby', 'Corner', 'Overlap', 'Tackle', 'Keeper', 'Backheel', 'Scorpion', 'Bicycle', 'Pressing',
  'Halfway', 'Byline', 'Crossbar', 'Upright', 'Dugout', 'Kickoff', 'Extra', 'Shootout', 'Winger', 'Playmaker', 'Anchor', 'Target',
]
const SYMBOLS = '!#$%&*+?@^~'
const randomInt = (max: number) => {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] % max
}

/** Three football words, a number and a symbol: easy to read out, hard to guess. Uses the browser's secure random. */
export function suggest(email = ''): string {
  for (;;) {
    const picked: string[] = []
    while (picked.length < 3) {
      const w = WORDS[randomInt(WORDS.length)]
      if (!picked.includes(w)) picked.push(w)
    }
    const pw = `${picked.join('-')}-${10 + randomInt(90)}${SYMBOLS[randomInt(SYMBOLS.length)]}`
    if (passes(pw, email)) return pw
  }
}
