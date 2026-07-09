import type { CSSProperties } from 'react'
import type { AudioInputDevice } from '../audio/mediaDevices'

interface Props {
  devices: AudioInputDevice[]
  selectedId: string
  onSelect: (id: string) => void
  onRefresh: () => void
}

export function AudioDeviceSelect({ devices, selectedId, onSelect, onRefresh }: Props) {
  return (
    <div>
      <label style={labelStyle} htmlFor="audio-input">
        Entrée audio du Mac
      </label>
      <div style={rowStyle}>
        <select
          id="audio-input"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={devices.length === 0}
          style={selectStyle}
        >
          {devices.length === 0 && <option value="">Aucune entrée détectée</option>}
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRefresh}>
          Rafraîchir
        </button>
      </div>
      <p style={tipStyle}>
        Astuce : pour envoyer Ableton, choisis BlackHole, Loopback ou une autre entrée audio
        virtuelle configurée sur ton Mac.
      </p>
    </div>
  )
}

const labelStyle: CSSProperties = { display: 'block', fontWeight: 600, marginBottom: 4 }
const rowStyle: CSSProperties = { display: 'flex', gap: 8 }
const selectStyle: CSSProperties = { flex: 1 }
const tipStyle: CSSProperties = { color: '#6b7280', marginTop: 8, fontSize: 13 }