import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { AudioMeter as MeterEngine } from '../audio/audioMeter'
import { cr } from './controlRoom'

/**
 * VU-mètre piloté par refs DOM : la barre et le texte sont mis à jour
 * directement dans la boucle rAF, sans re-render React (US-4.2).
 */
export function AudioMeter({ stream }: { stream: MediaStream | null }) {
  const barRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!stream) {
      reset()
      return
    }
    const meter = new MeterEngine(stream)
    meter.start((level) => {
      const pct = Math.min(100, Math.round(level.peak * 100))
      if (barRef.current) barRef.current.style.width = `${pct}%`
      if (textRef.current) {
        textRef.current.textContent = `${pct}% · ${level.db === -Infinity ? '-∞' : level.db.toFixed(1)} dB`
      }
    })
    return () => {
      void meter.stop()
      reset()
    }
  }, [stream])

  function reset(): void {
    if (barRef.current) barRef.current.style.width = '0%'
    if (textRef.current) textRef.current.textContent = '0% · -∞ dB'
  }

  return (
    <div>
      <div style={barWrap}>
        <div ref={barRef} style={{ ...barFill, width: '0%' }} />
      </div>
      <span ref={textRef} style={valueStyle}>
        0% · -∞ dB
      </span>
    </div>
  )
}

const barWrap: CSSProperties = {
  height: 16,
  width: '100%',
  background: cr.surfaceSunken,
  border: `1px solid ${cr.border}`,
  borderRadius: 4,
  overflow: 'hidden',
}
const barFill: CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #3a4a1a, #d8b32a 70%, #d9822a 88%, #c0392b)',
  transition: 'width 50ms linear',
}
const valueStyle: CSSProperties = {
  display: 'block',
  fontFamily: cr.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
  color: cr.textMuted,
  marginTop: 4,
}