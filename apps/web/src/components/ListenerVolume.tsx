import type { CSSProperties } from 'react'

interface Props {
  volume: number
  muted: boolean
  onVolumeChange: (volumePercent: number) => void
  onToggleMute: () => void
  disabled?: boolean
}

/**
 * Volume master local du listener : 0–100 % (0 = mute local, 100 = niveau reçu
 * original, jamais de boost). Affecte seulement l'écoute locale, pas le
 * broadcast performer ni LiveKit côté serveur.
 */
export function ListenerVolume({ volume, muted, onVolumeChange, onToggleMute, disabled }: Props) {
  return (
    <div style={wrapStyle}>
      <div style={rowStyle}>
        <button
          type="button"
          onClick={onToggleMute}
          disabled={disabled}
          aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
          style={muteBtnStyle}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          disabled={disabled}
          aria-label="Volume listener"
          style={rangeStyle}
        />
        <span style={valStyle}>{muted ? 0 : volume} %</span>
      </div>
    </div>
  )
}

const wrapStyle: CSSProperties = { marginTop: 4 }
const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const rangeStyle: CSSProperties = { flex: 1, minWidth: 120 }
const valStyle: CSSProperties = { fontSize: 14, minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const muteBtnStyle: CSSProperties = { fontSize: 18, lineHeight: 1, padding: '2px 8px' }