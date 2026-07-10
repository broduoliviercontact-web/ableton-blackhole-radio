import type { CSSProperties } from 'react'
import type { AudioInputDevice } from '../audio/mediaDevices'
import { cr } from './controlRoom'

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
        Source audio
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
        <button type="button" onClick={onRefresh} style={refreshBtnStyle}>
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

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.textMuted,
  marginBottom: 6,
}
const rowStyle: CSSProperties = { display: 'flex', gap: 8 }
const selectStyle: CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  fontSize: 14,
  fontFamily: cr.mono,
  color: cr.text,
  background: cr.surfaceSunken,
  border: `1px solid ${cr.borderStrong}`,
  borderRadius: 4,
}
const refreshBtnStyle: CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  fontFamily: cr.mono,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.text,
  background: cr.surfaceRaised,
  border: `1px solid ${cr.borderStrong}`,
  borderRadius: 4,
  cursor: 'pointer',
}
const tipStyle: CSSProperties = { color: cr.textDim, marginTop: 8, fontSize: 12, lineHeight: 1.5 }