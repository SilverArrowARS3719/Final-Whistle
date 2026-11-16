import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Cookie } from '@phosphor-icons/react'
import { consent, onConsent, setConsent } from '../../backend/consent'
import { openLegal } from '../screens/Legal'

/** Asks once. Both choices are equal: same size, same weight, no pre-selection, and saying no never blocks the game. */
export default function CookieBanner() {
  const [open, setOpen] = useState(() => consent() === null)
  useEffect(() => onConsent((c) => setOpen(c === null)), [])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title"
          initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26, delay: 0.6 }}>
          <Cookie weight="fill" className="cookie-ico" aria-hidden />
          <div className="cookie-copy">
            <b id="cookie-title">Can we count how the game is used?</b>
            <span>We store what the game needs to work. With your OK we also keep anonymous usage stats (no names, no ads) to see what to improve. <button className="linkish" onClick={() => openLegal('Cookies')}>Cookie policy</button></span>
          </div>
          <div className="cookie-actions">
            <button className="btn" onClick={() => setConsent('necessary')}>Only necessary</button>
            <button className="btn" onClick={() => setConsent('all')}>Accept all</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
