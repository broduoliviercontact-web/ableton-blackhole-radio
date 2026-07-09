import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { freqBands, spectralCentroid, timeLevel } from './analysisUtils'
import { useRafLoop } from './useRafLoop'
import { useCanvasResolution } from './useCanvasResolution'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  maxFps: number
}

const BANDS: Array<{ key: 'bass' | 'lowMid' | 'midHigh' | 'air'; label: string; color: string }> = [
  { key: 'bass', label: 'BASS 20–250', color: '#c0392b' },
  { key: 'lowMid', label: 'LO-MID 250–1k', color: '#d9822a' },
  { key: 'midHigh', label: 'HI-MID 1k–5k', color: '#d8b32a' },
  { key: 'air', label: 'AIR 5k–16k', color: '#f5d76b' },
]

/**
 * Spectral info maison (sans Meyda) : énergie 4 bandes, centroid spectral,
 * balance dominante, RMS. Tout calculé depuis les buffers AnalyserNode.
 */
export function SpectralInfo({ analyser, active, maxFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvasResolution(canvasRef)
  const textRef = useRef<HTMLDivElement>(null)

  useRafLoop(active, maxFps, () => {
    const a = analyser.mainAnalyser
    const canvas = canvasRef.current
    if (!a || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const sr = analyser.sampleRate
    const fft = a.fftSize
    const freq = new Uint8Array(a.frequencyBinCount)
    a.getByteFrequencyData(freq)
    const td = new Float32Array(a.fftSize)
    a.getFloatTimeDomainData(td)
    const b = freqBands(freq, sr, fft)
    const centroid = spectralCentroid(freq, sr, fft)
    const rmsDb = timeLevel(td).db
    draw(canvas, b)
    if (textRef.current) {
      const vals = [b.bass, b.lowMid, b.midHigh, b.air]
      const max = Math.max(...vals)
      const idx = vals.indexOf(max)
      const balance = max > 0.05 ? BANDS[idx].label.split(' ')[0] : 'SILENCE'
      textRef.current.textContent =
        `Centroid ${Math.round(centroid)} Hz · Balance ${balance} · RMS ${fmtDb(rmsDb)}`
    }
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span>SPECTRAL</span>
        <span style={sub}>bands · centroid · RMS</span>
      </div>
      <canvas ref={canvasRef} style={canvasStyle} />
      <div ref={textRef} style={foot}>Centroid — · Balance — · RMS —</div>
    </div>
  )
}

function fmtDb(db: number): string {
  return Number.isFinite(db) ? `${db.toFixed(1)} dB` : '−∞'
}

function draw(canvas: HTMLCanvasElement, b: { bass: number; lowMid: number; midHigh: number; air: number }): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0b0d12'
  ctx.fillRect(0, 0, w, h)
  const bw = (w - 40) / 4
  BANDS.forEach((band, i) => {
    const x = 8 + i * (bw + 8)
    const val = b[band.key]
    const bh = (h - 18) * val
    ctx.fillStyle = '#1a1d24'
    ctx.fillRect(x, 12, bw, h - 18)
    ctx.fillStyle = band.color
    ctx.fillRect(x, h - 6 - bh, bw, bh)
    ctx.fillStyle = '#5b6473'
    ctx.font = '10px ui-monospace, monospace'
    ctx.fillText(band.label, x, h - 3)
  })
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const sub: CSSProperties = { color: '#6b7280' }
const canvasStyle: CSSProperties = { width: '100%', height: 220, background: '#0b0d12', border: '1px solid #23262f', display: 'block' }
const foot: CSSProperties = { fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }