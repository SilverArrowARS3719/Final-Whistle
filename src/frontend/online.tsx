import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { HourglassMedium } from '@phosphor-icons/react'

// Who this device is in the current game. Offline, everyone shares one device, so every check passes.
export type OnlineInfo = { online: boolean; mySeat: number; isHost: boolean; names: string[] }
export const OnlineContext = createContext<OnlineInfo>({ online: false, mySeat: -1, isHost: true, names: [] })
export const useOnline = () => useContext(OnlineContext)

/** May this device act for `seat` right now? */
export function useCanAct(seat: number) {
  const o = useOnline()
  return !o.online || o.mySeat === seat
}
export function useIsHost() {
  const o = useOnline()
  return !o.online || o.isHost
}

/** Another player's turn: show the same screen live, but not clickable. */
export function Turn({ seat, children, note }: { seat: number; children: ReactNode; note?: string }) {
  const o = useOnline()
  if (!o.online || o.mySeat === seat) return <>{children}</>
  return (
    <div className="spectate">
      <div className="spectate-banner"><HourglassMedium weight="fill" /> {note ?? <>Waiting for <b>{o.names[seat]}</b>…</>}</div>
      <div inert>{children}</div>
    </div>
  )
}

/** Controls only the host uses (start, next lot, kick-off). Others see a short note instead. */
export function HostOnly({ children, note = 'Waiting for the host' }: { children: ReactNode; note?: string }) {
  const o = useOnline()
  if (!o.online || o.isHost) return <>{children}</>
  return <p className="dim small host-note"><HourglassMedium weight="bold" /> {note}…</p>
}

/** Online there's no device to pass round: the player whose turn it is skips the hand-over screen. */
export function useAutoReady(seat: number, onReady: () => void) {
  const o = useOnline()
  const done = useRef(false)
  useEffect(() => {
    if (o.online && o.mySeat === seat && !done.current) {
      done.current = true
      onReady()
    }
  }, [o.online, o.mySeat, seat, onReady])
  return o.online
}
