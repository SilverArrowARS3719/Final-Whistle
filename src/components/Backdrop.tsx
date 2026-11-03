import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

// Full-screen photo behind the page with a slow Ken Burns zoom. Each new photo gets a higher
// z-index so the newest one is always on top, however fast the source changes.
export default function Backdrop({ src, zoomSeconds = 9 }: { src: string; zoomSeconds?: number }) {
  const reduce = useReducedMotion()
  const layer = useRef({ src, n: 0 })
  if (layer.current.src !== src) layer.current = { src, n: layer.current.n + 1 }

  return createPortal(
    <div className="backdrop" aria-hidden>
      <div className="backdrop-imgs">
      <AnimatePresence initial={false}>
        <motion.img
          key={`${layer.current.n}-${src}`}
          src={src}
          alt=""
          style={{ zIndex: layer.current.n }}
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: reduce ? 1 : 1.02 }}
          exit={{ opacity: 0, transition: { duration: 0.9, delay: 0.25 } }}
          transition={{ opacity: { duration: 0.9 }, scale: { duration: zoomSeconds, ease: 'linear' } }}
        />
      </AnimatePresence>
      </div>
      <div className="backdrop-shade" />
    </div>,
    document.body,
  )
}
