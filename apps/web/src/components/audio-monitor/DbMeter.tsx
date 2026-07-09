import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { timeLevel, dbLabel } from './analysisUtils'
import { useRafLoop } from './useRafLoop'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  maxFps: number
}

const MIN_DB = -60
const dbToPos = (db: number): number => Math.max(0, Math.min(1, (db - MIN_DB) / -MIN_DB))

/**
 * Peak / dB meter : peak L/R, RMS L/R, master approx + label d'ambiance
 * (SILENCE / NORMAL / FORT / PROCHE CLIP). Monitoring navigateur, pas LUFS.
 */
export function DbMeter({ analyser, active, maxFps }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ pl: 0, pr: 0, rl: 0, rr: 0, ml: 'SILENCE', mlDb: -Infinity })

  useRafLoop(active, maxFps, () => {
    const la = analyser.leftAnalyser
    const ra = analyser.rightAnalyser
    const canvas = canvasRef.current
    if (!la || !ra || !canvas) return
    const lb = new Float32Array(la.fftSize)
    const rb = new Float32Array(ra.fftSize)
    la.getFloatTimeDomainData(lb)
    ra.getFloatTimeDomainData(rb)
    const ll = timeLevel(lb)
    const rl = timeLevel(rb)
    const masterDb = Math.max(ll.db, rl.db)
    stateRef.current = {
      pl: dbToPos(ll.peak === 0 ? -Infinity : 20 * Math.log10(ll.peak)),
      pr: dbToPos(rl.peak === 0 ? -Infinity : 20 * Math.log10(rl.peak)),
      rl: dbToPos(ll.db),
      rr: dbToPos(rl.db),
      ml: dbLabel(masterDb),
      mlDb: masterDb,
    }
    draw(canvas, stateRef.current)
  })

  const s = stateRef.current
  return (
    <div style={wrap}>
      <div style={head}>
        <span>PEAK / dB</span>
        <span style={accent}>{s.ml}</span>
      </div>
      <canvas ref={canvasRef} style={canvasStyle} />
      <div style={grid}>
        <span style={cell}>PK L <b>{fmt(s.pl)}</b></span>
        <span style={cell}>PK R <b>{fmt(s.pr)}</b></span>
        <span style={cell}>RMS L <b>{fmt(s.rl)}</b></span>
        <span style={cell}>RMS R <b>{fmt(s.rr)}</b></span>
        <span style={cell}>MASTER <b>{fmt(s.mlDb)}</b></span>
      </div>
    </div>
  )
}

function fmt(posOrDb: number): string {
  const db = MIN_DB + posOrDb * -MIN_DB
  return Number.isFinite(db) ? `${db.toFixed(1)} dB` : '—'
}

function draw(canvas: HTMLCanvasElement, s: { pl: number; pr: number; rl: number; rr: number; ml: string }): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0b0d12'
  ctx.fillRect(0, 0, w, h)
  const row = (y: number, val: number, color: string): void => {
    ctx.fillStyle = '#1a1d24'
    ctx.fillRect(8, y, w - 16, 8)
    ctx.fillStyle = color
    ctx.fillRect(8, y, (w - 16) * val, 8)
  }
  row(10, s.rl, '#d8b32a')
  row(24, s.rr, '#d8b32a')
  row(42, s.pl, '#d9822a')
  row(56, s.pr, '#d9822a')
  ctx.fillStyle = '#5b6473'
  ctx.font = '9px ui-monospace, monospace'
  ctx.fillText('RMS L', 8, 9)
  ctx.fillText('RMS R', 8, 23)
  ctx.fillText('PK L', 8, 41)
  ctx.fillText('PK R', 8, 55)
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const head: CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1, color: '#9ca3af', textTransform: 'uppercase' }
const accent: CSSProperties = { color: '#f5d76b', fontWeight: 700 }
const canvasStyle: CSSProperties = { width: '100%', height: 70, background: '#0b0d12', border: '1px solid #23262f', display: 'block' }
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#9ca3af', fontFamily: 'ui-monospace, monospace' }
const cell: CSSProperties = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #23262f', padding: '2px 0' }