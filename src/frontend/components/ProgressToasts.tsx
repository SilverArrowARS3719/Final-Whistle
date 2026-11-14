import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowFatUp, Medal, Sparkle } from '@phosphor-icons/react'
import { levelOf, onProgress } from '../../game/engine/progress'
import { sfx } from '../../game/engine/sfx'
import { track } from '../../backend/track'

type Toast = { id: number; kind: 'xp' | 'ach' | 'level'; title: string; line: string }
let next = 0

/** XP, achievement and level-up pop-ups, stacked bottom-right. Mounted once in main.tsx. */
export default function ProgressToasts() {
  const [list, setList] = useState<Toast[]>([])
  useEffect(() => onProgress((p, earned) => {
    if (!earned || earned.xp <= 0) return
    const add: Toast[] = [{ id: next++, kind: 'xp', title: `+${earned.xp} XP`, line: earned.reason }]
    earned.achievements.forEach((a) => {
      add.push({ id: next++, kind: 'ach', title: a.name, line: a.desc })
      track('achievement', { id: a.id })
    })
    if (earned.levelUp) {
      add.push({ id: next++, kind: 'level', title: `Level ${earned.levelUp}`, line: `${levelOf(p.xp).title}. New colours may be unlocked in Settings.` })
      track('level_up', { level: earned.levelUp })
    }
    if (earned.achievements.length || earned.levelUp) sfx.perfect()
    setList((l) => [...l, ...add])
    add.forEach((t, i) => setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 4200 + i * 900))
  }), [])

  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {list.map((t, i) => (
          <motion.div
            key={t.id}
            layout
            className={`ptoast ${t.kind}`}
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1, transition: { delay: i * 0.12, type: 'spring', stiffness: 320, damping: 26 } }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}
          >
            <span className="ptoast-icon">{t.kind === 'xp' ? <Sparkle weight="fill" /> : t.kind === 'ach' ? <Medal weight="fill" /> : <ArrowFatUp weight="fill" />}</span>
            <span><b>{t.kind === 'ach' ? `Achievement: ${t.title}` : t.title}</b><span>{t.line}</span></span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
