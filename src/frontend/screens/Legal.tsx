import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import Seg from '../components/Seg'
import { APP_NAME, LEGAL } from '../../game/engine/config'
import { resetConsent } from '../../backend/consent'

export type LegalTab = 'Privacy' | 'Terms' | 'Cookies' | 'Credits'
/** Open a legal page from anywhere (the cookie banner, the login card, settings). */
export const openLegal = (tab: LegalTab) => dispatchEvent(new CustomEvent('fw-legal', { detail: tab }))
const TABS: LegalTab[] = ['Privacy', 'Terms', 'Cookies', 'Credits']

const contact = LEGAL.contact
  ? <a href={`mailto:${LEGAL.contact}`}>{LEGAL.contact}</a>
  : <i>contact email to be added before launch</i>

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="legal-section"><h3>{title}</h3>{children}</section>
)

function Privacy() {
  return (
    <>
      <p className="legal-lead">{APP_NAME} is a free football game. We collect as little as possible, never sell data, and never show ads.</p>
      <Section title="Who we are">
        <p>{APP_NAME} is made by a small independent team{LEGAL.country ? ` based in ${LEGAL.country}` : ''}. Questions about your data, or anything else: {contact}.</p>
      </Section>
      <Section title="What we collect, and why">
        <table className="table legal-table">
          <thead><tr><th>Data</th><th>Why</th><th>Where it lives</th></tr></thead>
          <tbody>
            <tr><td>Your name or username</td><td>So other players know who built that XI</td><td>This device; our database if you have an account</td></tr>
            <tr><td>Email address (accounts only)</td><td>To log you in and reset your password. We don't send marketing emails.</td><td>Supabase (our database provider)</td></tr>
            <tr><td>Year of birth</td><td>To check you're old enough for an online account ({LEGAL.minAge}+). We don't ask for your full birthday.</td><td>This device; your account</td></tr>
            <tr><td>Games, results, leagues, friends</td><td>To run online games, league tables and friend lists</td><td>Our database</td></tr>
            <tr><td>Saved games, settings, XP, Daily Draft history</td><td>So the game remembers where you were</td><td>This device only</td></tr>
            <tr><td>Anonymous usage stats (only if you say yes)</td><td>Which screens are used and which modes get finished, to decide what to fix. A random id, never your name or email.</td><td>Our database</td></tr>
            <tr><td>Feedback you send</td><td>Your message, the name you give, the screen you were on and the game version, so we can fix things. Tied to your account if you have one.</td><td>Our database, until it is dealt with</td></tr>
          </tbody>
        </table>
        <p>We do not collect your location, contacts, photos, device identifiers, or anything from other apps.</p>
      </Section>
      <Section title="Logging in with Google or Microsoft">
        <p>If you choose one of these, that company confirms who you are and shares your email address with us. Their own privacy policy covers what they do.</p>
      </Section>
      <Section title="Who else sees it">
        <p>Only the services that run the game: <b>Supabase</b> stores accounts and online games. Your username, league tables and Daily Draft scores are visible to other players you play with. Nobody else gets your data, and we never sell it.</p>
      </Section>
      <Section title="Children">
        <p>Anyone can play offline on their own device. Online accounts are for ages {LEGAL.minAge} and over. If you're under {LEGAL.parentAge}, a parent or guardian must agree before you create an account. If you're a parent and think your child has an account they shouldn't, contact us and we'll delete it.</p>
      </Section>
      <Section title="Your choices and rights">
        <ul>
          <li><b>See or correct</b> your data: your profile page shows what we hold. Contact us for a copy.</li>
          <li><b>Delete</b> everything: Profile, then "Delete my data". It removes your account, results and stats straight away.</li>
          <li><b>Stop usage stats</b> any time: Settings, then Privacy.</li>
          <li><b>Emails</b>: we only send emails you need to log in (confirming your address, resetting a password). There is nothing to unsubscribe from.</li>
        </ul>
      </Section>
      <Section title="Which law applies">
        <p>We're based in Singapore, so your data is handled under Singapore's Personal Data Protection Act (PDPA). If you live in the EU or UK, you also have your rights under the GDPR, and we'll honour them. Email {contact} about any of the rights above and we'll reply within 30 days.</p>
      </Section>
      <Section title="How long we keep it">
        <p>Your account, results and any usage stats stay until you delete them (Profile, then "Delete my data"), or until you ask us to. Things stored only on your device stay until you delete them or clear your browser.</p>
      </Section>
      <p className="small dim">Last updated {LEGAL.updated}.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <p className="legal-lead">The short version: it's a free game, play fair, be kind to other players.</p>
      <Section title="Using the game">
        <p>{APP_NAME} is free. There are no purchases, subscriptions, ads or hidden fees, and nothing you can pay for. If that ever changes, prices will be shown clearly before anything is charged, and these terms will be updated first.</p>
      </Section>
      <Section title="Refunds">
        <p>Because nothing in {APP_NAME} costs money, there is nothing to refund. If paid features are ever added, a full refund policy will be published here before they go live.</p>
      </Section>
      <Section title="Your account">
        <p>Online accounts are for ages {LEGAL.minAge}+, with a parent or guardian's agreement under {LEGAL.parentAge}. Keep your password to yourself. You can delete your account at any time from your profile.</p>
      </Section>
      <Section title="Fair play">
        <ul>
          <li>Pick a username that isn't offensive or pretending to be someone else.</li>
          <li>Don't cheat, spam reactions or invites, or try to break the game or other players' games.</li>
          <li>We may remove accounts that do.</li>
        </ul>
      </Section>
      <Section title="Football names and ratings">
        <p>Player names are used to describe real footballers. Ratings, chemistry and match results are our own game estimates, not facts or official data, and the game isn't connected to or endorsed by any club, league or player.</p>
      </Section>
      <Section title="The small print">
        <p>The game is provided as it is. We do our best to keep it running and your progress safe, but can't promise it will never go down or lose data. Questions: {contact}.</p>
      </Section>
      <p className="small dim">Last updated {LEGAL.updated}.</p>
    </>
  )
}

function Cookies() {
  return (
    <>
      <p className="legal-lead">We don't use advertising or tracking cookies. The game stores a few things in your browser so it works.</p>
      <Section title="Always on (needed to play)">
        <table className="table legal-table">
          <tbody>
            <tr><td>Saved game, mode and settings</td><td>So a refresh doesn't lose your draft</td></tr>
            <tr><td>Your profile, XP, Daily Draft history</td><td>So your progress is kept</td></tr>
            <tr><td>Sound and colours</td><td>So we remember your preferences</td></tr>
            <tr><td>Cookie <code>fw_consent</code></td><td>Remembers this choice for six months, then we ask again</td></tr>
            <tr><td>Sign-in session (accounts only)</td><td>So you stay logged in</td></tr>
          </tbody>
        </table>
      </Section>
      <Section title="Only if you accept">
        <table className="table legal-table">
          <tbody>
            <tr><td>Anonymous usage stats</td><td>A random id plus which screens and modes were used. Helps us see where people get stuck.</td></tr>
          </tbody>
        </table>
        <p>Change your mind any time in Settings, then Privacy. Choosing "Only necessary" never blocks any part of the game.</p>
        <button className="btn" onClick={resetConsent}>Change my cookie choice</button>
      </Section>
      <p className="small dim">Last updated {LEGAL.updated}.</p>
    </>
  )
}

function Credits() {
  return (
    <>
      <p className="legal-lead">Where everything in the game comes from.</p>
      <Section title="Images">
        <p>The mode photos were generated with AI tools (Canva and Higgsfield) under their terms for commercial use. They show no real clubs, logos or people. Kicko, our mascot, is our own render. The player busts and the icons are drawn in code.</p>
      </Section>
      <Section title="Fonts and icons">
        <p>Big Shoulders Display, Onest and Geist Mono (SIL Open Font License). Phosphor Icons (MIT licence). All are bundled with the game, so no font or icon requests go to other servers.</p>
      </Section>
      <Section title="Software">
        <p>Built with React, Motion and Vite (MIT licences). Accounts and online play by Supabase.</p>
      </Section>
      <Section title="Reviews">
        <p>We don't publish ratings or reviews. Any review you see of {APP_NAME} is written by a real person independently of us.</p>
      </Section>
    </>
  )
}

export default function Legal({ initial = 'Privacy', onBack }: { initial?: LegalTab; onBack: () => void }) {
  const [tab, setTab] = useState<LegalTab>(initial)
  return (
    <div className="legal">
      <div className="screen-head">
        <div className="stack" style={{ gap: 12 }}>
          <button className="btn ghost sm" style={{ justifySelf: 'start' }} onClick={onBack}><ArrowLeft weight="bold" /> Back</button>
          <h2>{tab === 'Privacy' ? 'Privacy policy' : tab === 'Terms' ? 'Terms of service' : tab === 'Cookies' ? 'Cookie policy' : 'Credits and licences'}</h2>
        </div>
        <Seg id="legal-tab" options={TABS} value={tab} onChange={setTab} />
      </div>
      <motion.article key={tab} className="panel pad legal-body" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
        {tab === 'Privacy' ? <Privacy /> : tab === 'Terms' ? <Terms /> : tab === 'Cookies' ? <Cookies /> : <Credits />}
      </motion.article>
    </div>
  )
}
