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
      <label className="cr-label" htmlFor="audio-input">
        Source audio
      </label>
      <div className="cr-dev-row">
        <select
          id="audio-input"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={devices.length === 0}
          className="cr-select"
        >
          {devices.length === 0 && <option value="">Aucune entrée détectée</option>}
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRefresh} className="cr-btn--ghost">
          Rafraîchir
        </button>
      </div>
      <p className="cr-dev-tip">
        Astuce : pour envoyer Ableton, choisis BlackHole, Loopback ou une autre entrée audio
        virtuelle configurée sur ton Mac.
      </p>
    </div>
  )
}