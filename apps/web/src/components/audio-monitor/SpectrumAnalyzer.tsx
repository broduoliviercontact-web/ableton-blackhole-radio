import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { AudioMotionAnalyzer } from 'audiomotion-analyzer'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
}

/**
 * Spectrum analyzer via audioMotion-analyzer. Partage notre AudioContext et
 * utilise le mainAnalyser comme source (aucun nouveau graphe audible :
 * connectSpeakers false). Recréé quand l'écoute (re)devient active.
 */
export function SpectrumAnalyzer({ analyser, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const amRef = useRef<AudioMotionAnalyzer | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    const ctx = analyser.ctx
    const source = analyser.mainAnalyser
    if (!container || !ctx || !source) return
    const am = new AudioMotionAnalyzer(container, {
      audioCtx: ctx,
      source,
      connectSpeakers: false,
      frequencyScale: 'log',
      minFreq: 20,
      maxFreq: 20000,
      minDecibels: -90,
      maxDecibels: -20,
      fftSize: 2048,
      smoothing: 0.8,
      showScaleX: true,
      showScaleY: false,
      bgAlpha: 0,
      fillAlpha: 0,
      showBgColor: false,
      peakHoldTime: 200,
    })
    am.registerGradient('radio-amber', {
      bgColor: '#0b0d12',
      colorStops: ['#2a1f04', '#b8860b', '#d8b32a', '#f5d76b', '#f2ead2'],
    })
    am.gradient = 'radio-amber'
    amRef.current = am
    return () => {
      try {
        am.disconnectInput(source)
      } catch {
        // ignore
      }
      amRef.current = null
    }
  }, [active, analyser])

  return (
    <div style={wrap}>
      <div style={head}>
        <span>SPECTRUM</span>
        <span style={sub}>20 Hz → 20 kHz · log</span>
      </div>
      <div ref={containerRef} style={canvasStyle} />
    </div>
  )
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const sub: CSSProperties = { color: '#6b7280' }
const canvasStyle: CSSProperties = { width: '100%', height: 160, background: '#0b0d12', border: '1px solid #23262f' }