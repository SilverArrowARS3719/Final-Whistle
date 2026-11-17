import { useSyncExternalStore, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

// Per-device display settings. Applied as data attributes on <html> so plain CSS can react,
// and through MotionConfig so every motion/react animation respects "Reduced".
export type Prefs = { motion: 'full' | 'reduced'; effects: boolean; tips: boolean }
const KEY = 'fw-prefs'
const DEFAULT: Prefs = { motion: 'full', effects: true, tips: true }
const load = (): Prefs => { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return DEFAULT } }

let current = load()
const subs = new Set<() => void>()
export const getPrefs = () => current
export function applyPrefs() {
  const d = document.documentElement.dataset
  d.motion = current.motion
  d.effects = current.effects ? 'on' : 'off'
}
export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* this visit only */ }
  applyPrefs()
  subs.forEach((f) => f())
}
export const usePrefs = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, getPrefs)

/** Wraps the app so "Reduced motion" in Settings turns off transforms everywhere, like the OS setting does. */
export function PrefsMotion({ children }: { children: ReactNode }) {
  const p = usePrefs()
  return <MotionConfig reducedMotion={p.motion === 'reduced' ? 'always' : 'user'}>{children}</MotionConfig>
}
