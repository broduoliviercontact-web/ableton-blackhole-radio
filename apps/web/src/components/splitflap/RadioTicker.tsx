import type { CSSProperties } from 'react'
import type { TickerDirection } from '../../api/broadcastMessage'

interface Props {
  text: string
  enabled: boolean
  speedMs: number
  direction: TickerDirection
  separator: string
}

/**
 * Ticker bas = bandeau roulant. Défilement CSS seamless : le texte + séparateur
 * est dupliqué (unit × 2) et translateX 0 → -50% = exactement une unité → boucle
 * sans vide. Vitesse = `speedMs` (durée d'un passage), sens = left/right
 * (animation-direction reverse). `enabled` false → masqué. Séparateur inséré
 * entre les répétitions. prefers-reduced-motion fige l'animation côté CSS.
 */
export function RadioTicker({ text, enabled, speedMs, direction, separator }: Props) {
  if (!enabled) return null
  const unit = `${text}${separator}`
  const style = {
    '--sf-ticker-duration': `${speedMs}ms`,
    '--sf-ticker-dir': direction === 'right' ? 'reverse' : 'normal',
  } as CSSProperties
  return (
    <div className="sf-ticker" aria-label={text} style={style}>
      <span className="sf-ticker__track">{unit}{unit}</span>
    </div>
  )
}