import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { spectrogramRowValue, logFraction } from './analysisUtils'
import { useRafLoop } from './useRafLoop'
import { useCanvasResolution } from './useCanvasResolution'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  maxFps: number
}

const FMIN = 20
const FMAX = 20000
const MARKERS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]

const PALETTE = ['#0b0d12', '#1a1304', '#3a2a00', '#7a5a08', '#b8860b', '#d8b32a', '#f5d76b', '#f2ead2']

function colorFor(level: number): string {
  const i = Math.min(PALETTE.length - 1, Math.floor((level / 255) * PALETTE.length))
  return PALETTE[i]
}

function fmtFreq(f: number): string {
  return f >= 1000 ? `${f / 1000}k` : `${f}`
}

/**
 * Spectrogram waterfall. Axe horizontal = temps (décale d'1px/gauche, nouvelle
 * colonne à droite). Axe vertical = fréquence LOG : chaque ligne visuelle
 * couvre une bande géométrique [fLow,fHigh] et agrège (max) les bins FFT de
 * cette plage (spectrogramRowValue) → basses prennent plus de place, aigus
 * compressés. Repères fréquence log en overlay (canvas séparé, pas de trail).
 */
export function Spectrogram({ analyser, active, maxFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  useCanvasResolution(canvasRef)

  // Overlay repères fréquence (dessiné une fois + au resize ; pas dans le rAF).
  useEffect(() => {
    const ov = overlayRef.current
    if (!ov) return
    const draw = (): void => {
      const r = ov.getBoundingClientRect()
      ov.width = Math.max(1, Math.round(r.width))
      ov.height = Math.max(1, Math.round(r.height))
      const ctx = ov.getContext('2d')
      if (!ctx) return
      const w = ov.width
      const h = ov.height
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(35,38,47,0.8)'
      ctx.fillStyle = '#5b6473'
      ctx.font = '10px ui-monospace, Consolas, monospace'
      for (const f of MARKERS) {
        const y = Math.round((1 - logFraction(f, FMIN, FMAX)) * h)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
        ctx.fillText(fmtFreq(f), 2, Math.max(10, y - 2))
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(ov)
    return () => ro.disconnect()
  }, [])

  useRafLoop(active, maxFps, () => {
    const a = analyser.mainAnalyser
    const canvas = canvasRef.current
    if (!a || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    // waterfall : décale d'1px vers la gauche.
    ctx.drawImage(canvas, -1, 0)
    const freq = new Uint8Array(a.frequencyBinCount)
    a.getByteFrequencyData(freq)
    const sr = analyser.sampleRate
    const fft = a.fftSize
    // Une colonne à droite : chaque ligne = bande fréquence log agrégée (max).
    for (let y = 0; y < h; y++) {
      ctx.fillStyle = colorFor(spectrogramRowValue(freq, y, h, FMIN, FMAX, sr, fft))
      ctx.fillRect(w - 1, y, 1, 1)
    }
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span>SPECTROGRAM</span>
        <span style={sub}>waterfall · axe Y log · bas = graves</span>
      </div>
      <div style={stage}>
        <canvas ref={canvasRef} style={canvasStyle} />
        <canvas ref={overlayRef} style={overlayStyle} />
      </div>
    </div>
  )
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 auto', minHeight: 0 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const sub: CSSProperties = { color: '#6b7280' }
const stage: CSSProperties = { position: 'relative', width: '100%', flex: '1 1 auto', minHeight: 0 }
const canvasStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#0b0d12', border: '1px solid #23262f', display: 'block' }
const overlayStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }