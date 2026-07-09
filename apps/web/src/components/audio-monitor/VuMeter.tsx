import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { timeLevel } from './analysisUtils'
import { useRafLoop } from './useRafLoop'
import { useCanvasResolution } from './useCanvasResolution'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  maxFps: number
}

const MIN_DB = -60
const dbToPos = (db: number): number => Math.max(0, Math.min(1, (db - MIN_DB) / -MIN_DB))

/**
 * VU-mètre L/R : RMS par canal, ballistique VU (montée rapide, descente lente),
 * peak hold court. Canvas maison (le bus d'analyse donne déjà le time-domain).
 */
export function VuMeter({ analyser, active, maxFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvasResolution(canvasRef)
  const dispL = useRef(0)
  const dispR = useRef(0)
  const peakL = useRef(0)
  const peakR = useRef(0)
  const peakAt = useRef(0)

  useRafLoop(active, maxFps, () => {
    const la = analyser.leftAnalyser
    const ra = analyser.rightAnalyser
    const canvas = canvasRef.current
    if (!la || !ra || !canvas) return
    const lb = new Float32Array(la.fftSize)
    const rb = new Float32Array(ra.fftSize)
    la.getFloatTimeDomainData(lb)
    ra.getFloatTimeDomainData(rb)
    const tl = dbToPos(timeLevel(lb).db)
    const tr = dbToPos(timeLevel(rb).db)
    // Montée rapide, descente lente (ballistique VU).
    dispL.current = Math.max(tl, dispL.current - 0.025)
    dispR.current = Math.max(tr, dispR.current - 0.025)
    // Peak hold ~400 ms puis décline.
    const now = performance.now()
    if (tl >= peakL.current || now - peakAt.current > 400) peakL.current = tl
    if (tr >= peakR.current || now - peakAt.current > 400) peakR.current = tr
    if (tl >= peakL.current || tr >= peakR.current) peakAt.current = now
    peakL.current = Math.max(peakL.current - 0.004, tl)
    peakR.current = Math.max(peakR.current - 0.004, tr)
    draw(canvas, dispL.current, dispR.current, peakL.current, peakR.current)
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span>VU L/R</span>
        <span style={sub}>RMS · -60 → 0 dB</span>
      </div>
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  )
}

function draw(canvas: HTMLCanvasElement, l: number, r: number, pl: number, pr: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0b0d12'
  ctx.fillRect(0, 0, w, h)
  const bw = w / 2 - 14
  const drawBar = (x: number, val: number, peak: number): void => {
    const bh = (h - 24) * val
    const y = h - 12 - bh
    // gradation jaune→orange→rouge vers le haut.
    const g = ctx.createLinearGradient(0, h, 0, 0)
    g.addColorStop(0, '#3a4a1a')
    g.addColorStop(0.6, '#d8b32a')
    g.addColorStop(0.85, '#d9822a')
    g.addColorStop(1, '#c0392b')
    ctx.fillStyle = g
    ctx.fillRect(x, y, bw, bh)
    // peak hold marker.
    const py = h - 12 - (h - 24) * peak
    ctx.fillStyle = '#f2ead2'
    ctx.fillRect(x, py, bw, 2)
  }
  drawBar(8, l, pl)
  drawBar(w / 2 + 6, r, pr)
  // graduations.
  ctx.fillStyle = '#5b6473'
  ctx.font = '10px ui-monospace, monospace'
  for (const db of [-60, -40, -20, -6, 0]) {
    const y = h - 12 - (h - 24) * dbToPos(db)
    ctx.fillText(`${db}`, w - 30, y + 3)
  }
  ctx.fillStyle = '#9ca3af'
  ctx.fillText('L', 8, h - 1)
  ctx.fillText('R', w / 2 + 6, h - 1)
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 auto', minHeight: 0 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const sub: CSSProperties = { color: '#6b7280' }
const canvasStyle: CSSProperties = { width: '100%', flex: '1 1 auto', minHeight: 0, background: '#0b0d12', border: '1px solid #23262f', display: 'block' }