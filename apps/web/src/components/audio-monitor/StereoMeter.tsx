import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { correlation } from './analysisUtils'
import { useRafLoop } from './useRafLoop'
import { useCanvasResolution } from './useCanvasResolution'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  maxFps: number
}

/**
 * Vectorscope : x = L − R, y = L + R (centre = silence, ligne verticale = mono
 * centré, largeur = stéréo). Corrélation L/R → label Mono / Stereo / Phase risk.
 */
export function StereoMeter({ analyser, active, maxFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvasResolution(canvasRef)
  const corrRef = useRef(0)

  useRafLoop(active, maxFps, () => {
    const la = analyser.leftAnalyser
    const ra = analyser.rightAnalyser
    const canvas = canvasRef.current
    if (!la || !ra || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    // trail : fade léger au lieu de clear complet.
    ctx.fillStyle = 'rgba(11,13,18,0.35)'
    ctx.fillRect(0, 0, w, h)
    const lb = new Float32Array(la.fftSize)
    const rb = new Float32Array(ra.fftSize)
    la.getFloatTimeDomainData(lb)
    ra.getFloatTimeDomainData(rb)
    corrRef.current = correlation(lb, rb)
    const cx = w / 2
    const cy = h / 2
    const scale = w * 0.45
    ctx.fillStyle = '#f5d76b'
    const step = 2
    for (let i = 0; i < lb.length; i += step) {
      const l = lb[i]
      const r = rb[i]
      const x = cx + (l - r) * scale
      const y = cy - (l + r) * scale
      ctx.fillRect(x, y, 1.5, 1.5)
    }
    // repères : croix + diagonales.
    ctx.strokeStyle = '#23262f'
    ctx.beginPath()
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h)
    ctx.moveTo(0, cy); ctx.lineTo(w, cy)
    ctx.moveTo(0, 0); ctx.lineTo(w, h)
    ctx.moveTo(w, 0); ctx.lineTo(0, h)
    ctx.stroke()
  })

  const c = corrRef.current
  const label = c > 0.8 ? 'MONO' : c < 0 ? 'PHASE RISK' : 'STEREO'
  return (
    <div style={wrap}>
      <div style={head}>
        <span>STEREO / VECTORSCOPE</span>
        <span style={accent}>{label}</span>
      </div>
      <canvas ref={canvasRef} style={canvasStyle} />
      <div style={foot}>Correlation : {c.toFixed(2)}</div>
    </div>
  )
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 auto', minHeight: 0 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const accent: CSSProperties = { color: '#f5d76b', fontWeight: 700 }
const foot: CSSProperties = { fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace, monospace' }
const canvasStyle: CSSProperties = { width: '100%', flex: '1 1 auto', minHeight: 0, background: '#0b0d12', border: '1px solid #23262f', display: 'block' }