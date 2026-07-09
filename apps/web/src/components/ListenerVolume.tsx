import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

interface Props {
  volume: number
  muted: boolean
  trimMinus30Db: boolean
  onVolumeChange: (volumePercent: number) => void
  onToggleMute: () => void
  onToggleTrimMinus30Db: () => void
  disabled?: boolean
}

// Délai de discrimination clic / double-clic : un simple clic mute, un
// double-clic bascule le PAD -30 dB. Sans ce délai, les deux clics du
// double-clic déclencheraient deux mutes (mute→unmute = retour à l'état
// initial, mais avec un drop audio bref). ponytail: timer 250 ms, suffit
// pour la plupart des double-clics sans rendre le mute trop lent.
const CLICK_DELAY_MS = 250

/**
 * Volume master local du listener : 0–100 % (0 = mute local, 100 = niveau reçu
 * original, jamais de boost). Affecte seulement l'écoute locale, pas le
 * broadcast performer ni LiveKit côté serveur.
 *
 * Bouton haut-parleur : clic = mute/unmute, double-clic = PAD -30 dB (trim
 * -30 dB indépendant du mute). Le slider affiche toujours la valeur
 * utilisateur (jamais le volume effectif atténué).
 */
export function ListenerVolume({
  volume,
  muted,
  trimMinus30Db,
  onVolumeChange,
  onToggleMute,
  onToggleTrimMinus30Db,
  disabled,
}: Props) {
  const clickTimer = useRef<number | null>(null)

  // Premier clic → mute différé. Second clic (avant le délai) → on annule le
  // mute (ce sera un double-clic → trim). Le dblclick final bascule le trim.
  const handleClick = () => {
    if (disabled) return
    if (clickTimer.current == null) {
      clickTimer.current = window.setTimeout(() => {
        clickTimer.current = null
        onToggleMute()
      }, CLICK_DELAY_MS)
    } else {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
  }
  const handleDoubleClick = () => {
    if (disabled) return
    if (clickTimer.current != null) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
    onToggleTrimMinus30Db()
  }

  // Nettoie le timer différé au démontage (pas de mute orphelin).
  useEffect(() => {
    return () => {
      if (clickTimer.current != null) clearTimeout(clickTimer.current)
    }
  }, [])

  const padLabel = trimMinus30Db ? ' · PAD -30 dB' : ''
  const ariaLabel = `Haut-parleur (clic : mute, double-clic : PAD -30 dB${trimMinus30Db ? ', PAD actif' : ''})`

  return (
    <div style={wrapStyle}>
      <div style={rowStyle}>
        <button
          type="button"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          disabled={disabled}
          aria-label={ariaLabel}
          title="Clic : mute · Double-clic : PAD -30 dB"
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
        <span style={valStyle}>
          {muted ? 0 : volume} %{padLabel}
        </span>
      </div>
    </div>
  )
}

const wrapStyle: CSSProperties = { marginTop: 4 }
const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const rangeStyle: CSSProperties = { flex: 1, minWidth: 120 }
const valStyle: CSSProperties = { fontSize: 14, minWidth: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const muteBtnStyle: CSSProperties = { fontSize: 18, lineHeight: 1, padding: '2px 8px' }