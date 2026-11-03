import { chemBoosts } from './chemistry'
import { doubledIds, slotsOf, type Team } from './draft'
import { penalty } from './position'
import { statsAt, type MatchResult } from './sim'
import { findRole } from './tactics'

// Post-match tactical report. Every rule here mirrors a real effect in sim.ts, so the advice is honest.
export type Insight = { good: boolean; text: string }
export type Report = { insights: Insight[]; notes: Record<string, string[]> }

export function analyse(m: MatchResult, teams: [Team, Team]): [Report, Report] {
  const st = statsAt(m, m.labels.length - 1)
  const final = m.snapshots[m.snapshots.length - 1]
  const side = (s: 0 | 1): Report => {
    const o = (1 - s) as 0 | 1
    const team = teams[s]
    const t = team.tactics, ot = teams[o].tactics
    const mine = s === 0 ? st.a : st.b
    const theirs = s === 0 ? st.b : st.a
    const out: Insight[] = []
    const notes: Record<string, string[]> = {}
    const note = (name: string, n: string) => (notes[name] ??= []).push(n)
    const bad = (text: string) => out.push({ good: false, text })
    const good = (text: string) => out.push({ good: true, text })

    // out of position
    slotsOf(team).forEach((slot, i) => {
      const p = team.picks[i]
      if (!p) return
      const pen = penalty(p, slot.pos)
      if (pen >= 4) note(p.name, `Out of position at ${slot.pos} (−${pen})`)
      if (slot.pos === 'GK' && pen >= 30) bad(`${p.name} in goal was a disaster: an outfielder loses ${pen} OVR there and shots fly in.`)
      else if (pen >= 6) bad(`${p.name} is a ${p.positions[0]} playing ${slot.pos}, so he lost ${pen} OVR. Pick players for their natural slot.`)
    })

    // build-up vs their defensive approach
    const counterish = t.buildUp === 'Counter' || t.buildUp === 'Long Ball'
    const theyCounter = ot.buildUp === 'Counter' || ot.buildUp === 'Long Ball'
    if (t.line >= 7 && theyCounter) bad(`Your high line (${t.line}) left space behind for their ${ot.buildUp}. Drop it to 5 or below against that.`)
    else if (t.line >= 7) good(`Your high line (${t.line}) squeezed their ${ot.buildUp.toLowerCase()} build-up.`)
    if (t.buildUp === 'Counter' && ot.defence === 'Deep') bad('Counter attacks had no space behind their Deep block. Short Passing breaks a deep side down better.')
    if (t.buildUp === 'Counter' && (ot.defence === 'High' || ot.defence === 'Aggressive') && ot.line >= 6) good(`Your counters punished their ${ot.defence.toLowerCase()} line.`)
    if (t.buildUp === 'Short Passing' && ot.defence === 'Aggressive') bad('Their Aggressive press disrupted your Short Passing. Counter or Long Ball beats a press.')
    if (t.buildUp === 'Short Passing' && ot.defence === 'Deep') good('Patient Short Passing was the right key for their Deep block.')
    if (t.buildUp === 'Long Ball' && !t.roles.some((r, i) => findRole(slotsOf(team)[i].pos, r.role).name === 'Target Forward'))
      bad('Long Ball without a Target Forward wastes a lot of balls. Set your striker to Target Forward.')
    if (counterish && ot.line <= 3) bad(`Their line was deep (${ot.line}), so there was little space to run into.`)

    // possession and chances
    if (st.poss[s] <= 40) bad(`You only had ${st.poss[s]}% of the ball. A stronger midfield or Short Passing would keep it longer.`)
    else if (st.poss[s] >= 60) good(`You controlled the ball (${st.poss[s]}% possession).`)
    if (mine.shots >= 12 && mine.goals <= 1) bad(`${mine.shots} shots but only ${mine.goals} goal${mine.goals === 1 ? '' : 's'}.${t.width >= 7 ? ` Width ${t.width} creates lots of low-quality crosses; try narrower.` : ' Give your striker a Poacher role for better finishing.'}`)
    if (theirs.chances >= 4) bad(`You gave up ${theirs.chances} big chances.${t.width >= 7 ? ' A wide shape leaves gaps in the middle.' : ''}${t.defence === 'Aggressive' ? ' Aggressive pressing gets bypassed.' : ''}`)
    if (theirs.shots <= 6) good(`Defensively solid: they only managed ${theirs.shots} shots.`)

    // discipline and legs
    if (mine.reds > 0) bad(`A red card left you with ${teams[s].picks.length - mine.reds} men and cost you chances for the rest of the game.`)
    if (mine.yellows >= 3 && (t.defence === 'Aggressive' || t.roles.some((r) => r.role === 'Stopper')))
      bad(`${mine.yellows} yellow cards. Aggressive pressing and Stopper roles pick up bookings.`)
    const tired = final[s].filter((l) => !l.off && l.fit < 40)
    tired.forEach((l) => note(l.name, `Exhausted (${l.fit}% fitness)`))
    if (tired.length >= 2) bad(`${tired.map((l) => l.name.split(' ').slice(-1)[0]).join(', ')} ran out of legs. Aggressive pressing, Wingbacks and Box-to-Box roles drain fitness.`)

    // chemistry
    const chem = chemBoosts(team.picks, doubledIds(team)).reduce((a, b) => a + b, 0)
    if (chem <= 6) bad(`Low chemistry (+${chem}). Players who share a club, nation, league or era lift each other.`)
    else if (chem >= 18) good(`Great chemistry (+${chem}) gave every line a boost.`)

    // player notes from events
    for (const e of m.events) {
      if (e.side !== s || !e.player) continue
      if (e.type === 'goal') note(e.player, 'Scored')
    }
    for (const e of m.events) if (e.side === s && e.type === 'red') note(e.text.replace(/^RED CARD: /, '').replace(/ \(.*$/, ''), 'Sent off')

    if (!out.some((i) => !i.good)) good('No glaring tactical problems. This one came down to quality and luck.')
    return { insights: out, notes }
  }
  return [side(0), side(1)]
}
