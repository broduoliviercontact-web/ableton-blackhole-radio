import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { AudioMotionAnalyzer } from 'audiomotion-analyzer'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { logFraction } from './analysisUtils'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
}

const FMIN = 20
const FMAX = 20000
const MARKERS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]

function fmtFreq(f: number): string {
  return f >= 1000 ? `${f / 1000}k` : `${f}`
}

/**
 * Spectrum analyzer via audioMotion-analyzer. Échelle logarithmique 20 Hz →
 * 20 kHz (frequencyScale 'log'). Partage notre AudioContext + mainAnalyser
 * (connectSpeakers false → aucun graphe audible). Repères fréquence log
 * dessinés en overlay (onCanvasDraw) : 20/50/100/200/500/1k/2k/5k/10k/20k.
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
      minFreq: FMIN,
      maxFreq: FMAX,
      minDecibels: -90,
      maxDecibels: -20,
      fftSize: 2048,
      smoothing: 0.8,
      showScaleX: false, // échelle log dessinée en overlay (repères exacts).
      showScaleY: false,
      bgAlpha: 0,
      fillAlpha: 0,
      showBgColor: false,
      peakHoldTime: 200,
      onCanvasDraw: drawLogScale,
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

// Overlay : grille + labels fréquence log, tracé après le rendu audioMotion.
function drawLogScale(am: AudioMotionAnalyzer): void {
  const ctx = am.canvasCtx
  const w = am.canvas.width
  const h = am.canvas.height
  const labelH = 16
  ctx.save()
  ctx.strokeStyle = 'rgba(35,38,47,0.9)'
  ctx.fillStyle = '#5b6473'
  ctx.font = '10px ui-monospace, Consolas, monospace'
  ctx.lineWidth = 1
  for (const f of MARKERS) {
    const x = Math.round(logFraction(f, FMIN, FMAX) * w)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h - labelH)
    ctx.stroke()
    const label = fmtFreq(f)
    const tw = ctx.measureText(label).width
    ctx.fillText(label, Math.min(w - tw, Math.max(0, x + 2)), h - 4)
  }
  ctx.restore()
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const sub: CSSProperties = { color: '#6b7280' }
const canvasStyle: CSSProperties = { width: '100%', height: 320, background: '#0b0d12', border: '1px solid #23262f' }