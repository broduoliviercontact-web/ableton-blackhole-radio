import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { useRafLoop } from './useRafLoop'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  maxFps: number
}

const PALETTE = ['#0b0d12', '#1a1304', '#3a2a00', '#7a5a08', '#b8860b', '#d8b32a', '#f5d76b', '#f2ead2']

function colorFor(level: number): string {
  // level 0..255 → palette index.
  const i = Math.min(PALETTE.length - 1, Math.floor((level / 255) * PALETTE.length))
  return PALETTE[i]
}

/**
 * Spectrogram waterfall : chaque frame décale le canvas d'1px vers la gauche et
 * dessine une colonne à droite (fréquence basse en bas) depuis getByteFrequencyData.
 * Linéaire v1 ; FPS limité via maxFps (≤24). Se clear au reset.
 */
export function Spectrogram({ analyser, active, maxFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useRafLoop(active, maxFps, () => {
    const a = analyser.mainAnalyser
    const canvas = canvasRef.current
    if (!a || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    // décale d'1px vers la gauche (waterfall).
    ctx.drawImage(canvas, -1, 0)
    // nouvelle colonne à droite.
    const freq = new Uint8Array(a.frequencyBinCount)
    a.getByteFrequencyData(freq)
    const bins = freq.length
    for (let y = 0; y < h; y++) {
      // bas du canvas = basses fréquences.
      const idx = bins - 1 - Math.floor((y / h) * bins)
      ctx.fillStyle = colorFor(freq[idx] ?? 0)
      ctx.fillRect(w - 1, y, 1, 1)
    }
  })

  return (
    <div style={wrap}>
      <div style={head}>
        <span>SPECTROGRAM</span>
        <span style={sub}>waterfall · bas = graves</span>
      </div>
      <canvas ref={canvasRef} style={canvasStyle} />
    </div>
  )
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const sub: CSSProperties = { color: '#6b7280' }
const canvasStyle: CSSProperties = { width: '100%', height: 160, background: '#0b0d12', border: '1px solid #23262f', display: 'block' }