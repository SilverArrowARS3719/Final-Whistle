import type { Player } from '../data/players'
import Bust from './Bust'
import Tilt from './Tilt'

export const tier = (ovr: number) => (ovr >= 90 ? 't-elite' : ovr >= 85 ? 't-gold' : 't-silver')

export default function PlayerCard({ p, ovr = p.ovr, tilt = true }: { p: Player; ovr?: number; tilt?: boolean }) {
  const body = (
    <>
      <Bust p={p} />
      <div style={{ position: 'relative' }}>
        <div className="ovr num">{ovr}</div>
        <div className="pos">{p.positions.join(' ')}</div>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="nm">{p.name}</div>
        <div className="meta"><span>{p.nation}</span><span>{p.era}</span></div>
      </div>
    </>
  )
  return tilt ? <Tilt className={`pcard ${tier(ovr)}`} max={14}>{body}</Tilt> : <div className={`pcard ${tier(ovr)}`}>{body}</div>
}
