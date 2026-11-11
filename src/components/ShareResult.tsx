import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DownloadSimple, ShareNetwork, X } from '@phosphor-icons/react'
import { cardText, renderResultCard, type ResultCard } from '../engine/shareCard'
import { record } from '../engine/progress'
import { track } from '../online/track'

/** "Share result" button: draws the card, previews it, then hands it to the phone's share sheet (or downloads it). */
export default function ShareResult({ card, label = 'Share result' }: { card: ResultCard; label?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const open = async () => {
    setBusy(true)
    setError('')
    try {
      const blob = await renderResultCard(card)
      setFile(new File([blob], 'result.png', { type: 'image/png' }))
      setUrl(URL.createObjectURL(blob))
      record({ kind: 'share' })
      track('share', { what: card.kicker })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const canShare = !!file && !!navigator.canShare?.({ files: [file] })
  const share = async () => {
    try { await navigator.share({ files: [file!], text: cardText(card) }) } catch { /* closed the share sheet */ }
  }
  const close = () => { setUrl(null); setFile(null) }

  return (
    <>
      <button className="btn" onClick={open} disabled={busy}>
        {busy ? <span className="spin" aria-hidden /> : <ShareNetwork weight="bold" />} {label}
      </button>
      {error && <p className="small" role="alert" style={{ color: 'var(--hot)' }}>{error}</p>}
      <AnimatePresence>
        {url && (
          <motion.div className="share-modal" role="dialog" aria-label="Result card" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="share-sheet" onClick={(e) => e.stopPropagation()} initial={{ y: 40, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              <img src={url} alt={cardText(card)} />
              <div className="row" style={{ gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {canShare && <button className="btn primary" onClick={share}><ShareNetwork weight="bold" /> Share</button>}
                <a className={`btn ${canShare ? '' : 'primary'}`} href={url} download="result.png"><DownloadSimple weight="bold" /> Save image</a>
                <button className="btn ghost" onClick={close} aria-label="Close"><X weight="bold" /></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
