import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { PLAYERS } from '../data/players'
import { WINNER_PLAYERS } from '../data/winners'
import { CARDS } from './chaos'

// Game state lives in a Store. Offline it's this browser (a refresh resumes the game); online it's the shared
// game every player's device syncs to (see online/game.ts). Screens just call usePersist and don't care which.

export type Op = { path: string[]; value: unknown }
export interface Store {
  get(key: string): unknown
  set(key: string, value: unknown): void
  subscribe(fn: () => void): () => void
  // offline any device may write a missing key's starting value; online only the host does, so random
  // starting values (a Chaos card, an auction lot) are decided once
  canInit: boolean
  /** Forget every key starting with `scope` (everything when empty). */
  clear(scope?: string): void
}

// Player and Chaos-card objects are re-linked to the shared originals: game code compares them by identity,
// and cards carry functions that JSON can't store.
export function revive(_k: string, v: unknown) {
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (typeof o.id === 'number' && 'ovr' in o && 'positions' in o) return (o.id >= 10_000 ? WINNER_PLAYERS[o.id - 10_000] : PLAYERS[o.id]) ?? v
    if (typeof o.id === 'string' && 'rarity' in o && 'category' in o) return CARDS.find((c) => c.id === o.id) ?? v
  }
  return v
}
export const reviveDeep = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v), revive))

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object'
const isEntity = (x: Record<string, unknown>) => 'ovr' in x || 'rarity' in x

// Smallest set of path edits turning `a` into `b`. Arrays that change length, removed keys and
// player/card objects are replaced whole (the server can only set paths, not delete them).
export function diff(a: unknown, b: unknown, path: string[] = []): Op[] {
  if (a === b) return []
  if (isObj(a) && isObj(b) && Array.isArray(a) === Array.isArray(b) && !isEntity(a) && !isEntity(b)) {
    if (Array.isArray(a) && a.length !== (b as unknown as unknown[]).length) return [{ path, value: b }]
    const removed = Object.keys(a).some((k) => a[k] !== undefined && b[k] === undefined)
    if (removed) return [{ path, value: b }]
    return Object.keys(b).flatMap((k) => (b[k] === undefined ? [] : diff(a[k], b[k], [...path, k])))
  }
  return [{ path, value: b === undefined ? null : b }]
}

// Immutable path set: copies only along the path so React sees what changed.
export function setIn(root: unknown, path: string[], value: unknown): unknown {
  if (!path.length) return value
  const [k, ...rest] = path
  const base = Array.isArray(root) ? [...root] : isObj(root) ? { ...root } : {}
  ;(base as Record<string, unknown>)[k] = setIn((base as Record<string, unknown>)[k], rest, value)
  return base
}

// ---------- offline store: this browser ----------
const PREFIX = 'fw-game:'
class LocalStore implements Store {
  canInit = true
  private cache = new Map<string, unknown>()
  private subs = new Set<() => void>()
  get(key: string) {
    if (!this.cache.has(key)) {
      try {
        const raw = localStorage.getItem(PREFIX + key)
        this.cache.set(key, raw === null ? undefined : JSON.parse(raw, revive))
      } catch {
        this.cache.set(key, undefined)
      }
    }
    return this.cache.get(key)
  }
  set(key: string, value: unknown) {
    this.cache.set(key, value)
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // storage full or blocked: the game still works, it just won't survive a refresh
    }
    this.subs.forEach((f) => f())
  }
  subscribe(fn: () => void) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
  clear(scope = '') {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIX + scope)).forEach((k) => localStorage.removeItem(k))
    } catch {
      // nothing to clear
    }
    for (const k of [...this.cache.keys()]) if (k.startsWith(scope)) this.cache.delete(k)
    this.subs.forEach((f) => f())
  }
}
export const localStore = new LocalStore()
export const StoreContext = createContext<Store>(localStore)

// Drop saved offline keys starting with `scope` (the whole saved game when empty).
export const clearSaved = (scope = '') => localStore.clear(scope)

export function usePersist<T>(key: string, init: T | (() => T)) {
  const store = useContext(StoreContext)
  const [, rerender] = useReducer((x: number) => x + 1, 0)
  useEffect(() => store.subscribe(rerender), [store])
  const stored = store.get(key) as T | undefined
  const first = useRef<{ v: T } | null>(null)
  if (stored === undefined && !first.current) first.current = { v: typeof init === 'function' ? (init as () => T)() : init }
  useEffect(() => {
    if (store.get(key) === undefined && store.canInit && first.current) store.set(key, first.current.v)
  }, [store, key])
  const value = stored !== undefined ? stored : (first.current as { v: T }).v
  const set = (next: T | ((prev: T) => T)) => {
    const prev = (store.get(key) as T | undefined) ?? value
    store.set(key, typeof next === 'function' ? (next as (p: T) => T)(prev) : next)
  }
  return [value, set] as const
}
