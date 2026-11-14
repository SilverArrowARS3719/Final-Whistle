import Seg from './Seg'
import type { ChaosSettings } from '../../game/engine/chaos'

const CATS: [keyof Omit<ChaosSettings, 'every'>, string, string][] = [
  ['restriction', 'Restriction', 'Limit who you can pick'],
  ['modifier', 'Modifier', 'Captains, double links, hot heads'],
  ['wild', 'Wild', 'Steals, reverses, lucky dips'],
]

export default function ChaosSettingsPanel({ value, onChange }: { value: ChaosSettings; onChange: (v: ChaosSettings) => void }) {
  return (
    <div className="panel pad chaos-settings">
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Card frequency</span>
        <Seg id="chaos-every" options={[1, 2] as (1 | 2)[]} value={value.every} onChange={(every) => onChange({ ...value, every })} label={(e) => (e === 1 ? 'Every round' : 'Every 2 rounds')} />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Cards in the deck</span>
        <div className="row">
          {CATS.map(([k, name, hint]) => (
            <button key={k} className={`toggle ${value[k] ? 'on' : ''}`} aria-pressed={value[k]} onClick={() => onChange({ ...value, [k]: !value[k] })} title={hint}>
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
