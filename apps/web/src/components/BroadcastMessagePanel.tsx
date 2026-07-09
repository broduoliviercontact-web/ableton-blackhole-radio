import type { CSSProperties } from 'react'
import type { BroadcastMessage } from '../api/broadcastMessage'

interface Props {
  message: BroadcastMessage
}

/**
 * Affiche le message broadcast en 4 zones (MVP HTML/CSS simple — le split-flap
 * animé arrive au LOT 4) :
 *   1. mainTitle (grand)
 *   2. subtitle / artist / album (secondaire)
 *   3. note (zone longue)
 *   4. ticker (bandeau bas)
 */
export function BroadcastMessagePanel({ message }: Props) {
  const secondary = [message.subtitle, message.artist, message.album].filter(Boolean).join(' · ')
  return (
    <div style={panelStyle}>
      <h2 style={titleStyle}>{message.mainTitle}</h2>
      {secondary && <p style={secondaryStyle}>{secondary}</p>}
      {message.note && <p style={noteStyle}>{message.note}</p>}
      {message.ticker && <div style={tickerStyle}>{message.ticker}</div>}
    </div>
  )
}

const panelStyle: CSSProperties = {
  border: '1px solid #1f2937',
  background: '#0b0f17',
  color: '#e5e7eb',
  borderRadius: 8,
  padding: 16,
  marginTop: 12,
  fontFamily: 'system-ui, sans-serif',
}
const titleStyle: CSSProperties = {
  fontSize: 'clamp(22px, 4vw, 34px)',
  margin: 0,
  letterSpacing: 1,
  lineHeight: 1.1,
}
const secondaryStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#9ca3af',
  fontSize: 15,
}
const noteStyle: CSSProperties = {
  margin: '12px 0 0',
  color: '#d1d5db',
  fontSize: 14,
  whiteSpace: 'pre-wrap',
}
const tickerStyle: CSSProperties = {
  marginTop: 14,
  padding: '6px 10px',
  borderTop: '1px solid #1f2937',
  color: '#fbbf24',
  fontSize: 13,
  letterSpacing: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}