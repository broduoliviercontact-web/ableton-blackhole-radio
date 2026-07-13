import { VisualCanvas } from '../shared/VisualCanvas'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import { clamp } from '../shared/canvasUtils'
import type { RadioVisualProps } from '../radioVisualTypes'

export function EventHorizonVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--horizon" data={data} visual={visual} metrics={metrics} preview={preview}>
      <VisualCanvas className="rdv-horizon__canvas" label="Horizon d evenement radio" metrics={metrics} draw={({ ctx, width, height, time, metrics: m }) => {
        ctx.fillStyle = '#050308'; ctx.fillRect(0, 0, width, height)
        const cx = width * .5; const cy = height * .48; const core = Math.min(width, height) * (.12 + m.bass * .08)
        const glow = ctx.createRadialGradient(cx, cy, core * .2, cx, cy, core * 5)
        glow.addColorStop(0, '#070509'); glow.addColorStop(.22, '#ffb23c'); glow.addColorStop(.42, '#9b1f5d'); glow.addColorStop(1, 'rgba(7,3,12,0)')
        ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height)
        ctx.strokeStyle = `rgba(255,200,104,${.28 + m.treble * .5})`; ctx.lineWidth = 1.2
        const turns = 7 + Math.round(visual.visualDensity / 18)
        for (let turn = 0; turn < turns; turn += 1) {
          ctx.beginPath()
          for (let point = 0; point < 100; point += 1) {
            const theta = point / 100 * Math.PI * 2 + time / (1200 + visual.visualSpeed * 12) + turn
            const radius = core * (1.3 + turn * .31) + Math.sin(theta * 3 + turn) * (6 + m.mid * 18)
            const x = cx + Math.cos(theta) * radius * 1.45
            const y = cy + Math.sin(theta) * radius * .48
            if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
        ctx.fillStyle = '#020104'; ctx.beginPath(); ctx.arc(cx, cy, core, 0, Math.PI * 2); ctx.fill()
      }} />
      <div className="rdv-horizon__copy"><span>EVENT HORIZON / {status.toUpperCase()}</span><h1>{data.title}</h1><p>{data.secondary}</p></div>
    </RadioVisualShell>
  )
}

export function RadarTransmissionVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--radar" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-radar__head"><span>RADAR TRANSMISSION / {status.toUpperCase()}</span><span>SECTOR {String(Math.round(metrics.centroid * 99)).padStart(2, '0')}</span></div>
      <VisualCanvas className="rdv-radar__canvas" label="Radar de transmission audio" metrics={metrics} draw={({ ctx, width, height, time, metrics: m }) => {
        ctx.fillStyle = '#03100c'; ctx.fillRect(0, 0, width, height)
        const cx = width * .5; const cy = height * .52; const radius = Math.min(width, height) * .42
        ctx.strokeStyle = 'rgba(84,255,154,.18)'; ctx.lineWidth = 1
        for (let ring = 1; ring <= 4; ring += 1) { ctx.beginPath(); ctx.arc(cx, cy, radius * ring / 4, 0, Math.PI * 2); ctx.stroke() }
        ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius); ctx.stroke()
        const angle = time / (900 + visual.visualSpeed * 8)
        const wedge = ctx.createConicGradient?.(angle, cx, cy)
        if (wedge) { wedge.addColorStop(0, 'rgba(84,255,154,.42)'); wedge.addColorStop(.18, 'rgba(84,255,154,0)'); wedge.addColorStop(1, 'rgba(84,255,154,0)'); ctx.fillStyle = wedge; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill() }
        for (let index = 0; index < 12; index += 1) {
          const energy = m.spectrum[(index * 9) % m.spectrum.length] / 255
          if (energy < .12) continue
          const targetAngle = index * 2.37 + m.now / 5000
          const targetRadius = radius * (.24 + ((index * 17) % 70) / 100)
          const x = cx + Math.cos(targetAngle) * targetRadius; const y = cy + Math.sin(targetAngle) * targetRadius
          ctx.fillStyle = `rgba(144,255,180,${.2 + energy * .8})`; ctx.beginPath(); ctx.arc(x, y, 2 + energy * 4, 0, Math.PI * 2); ctx.fill()
        }
      }} />
      <p className="rdv-radar__title">{data.title} // {data.secondary}</p>
    </RadioVisualShell>
  )
}

export function ConstellationRadioVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--constellation" data={data} visual={visual} metrics={metrics} preview={preview}>
      <VisualCanvas className="rdv-constellation__canvas" label="Constellation radio reactive" metrics={metrics} draw={({ ctx, width, height, time, metrics: m }) => {
        ctx.fillStyle = '#060815'; ctx.fillRect(0, 0, width, height)
        const count = 22 + Math.round(visual.visualDensity * .45)
        const points = Array.from({ length: count }, (_, index) => {
          const energy = m.spectrum[index % m.spectrum.length] / 255
          return { x: (Math.sin(index * 91.7 + time / 2400) * .42 + .5) * width, y: (Math.cos(index * 53.1 + time / 3100) * .38 + .5) * height, energy }
        })
        for (let index = 0; index < points.length; index += 1) for (let other = index + 1; other < points.length; other += 1) {
          const a = points[index]; const b = points[other]; const dx = a.x - b.x; const dy = a.y - b.y; const distance = Math.hypot(dx, dy)
          if (distance > Math.min(width, height) * .24) continue
          ctx.strokeStyle = `rgba(153,178,255,${.04 + (1 - distance / (Math.min(width, height) * .24)) * .25})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        for (const point of points) { ctx.fillStyle = `rgba(219,229,255,${.35 + point.energy * .65})`; ctx.beginPath(); ctx.arc(point.x, point.y, 1 + point.energy * 3, 0, Math.PI * 2); ctx.fill() }
      }} />
      <div className="rdv-constellation__copy"><span>CONSTELLATION RADIO / {status.toUpperCase()}</span><h1>{data.title}</h1><p>{data.note}</p></div>
    </RadioVisualShell>
  )
}

export function PixelMosaicVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--mosaic" data={data} visual={visual} metrics={metrics} preview={preview}>
      <VisualCanvas className="rdv-mosaic__canvas" label="Mosaique de pixels reactive" metrics={metrics} draw={({ ctx, width, height, time, metrics: m }) => {
        ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, width, height)
        const cols = 10 + Math.round(visual.visualDensity * .34); const rows = Math.max(8, Math.round(cols * height / width)); const cellW = width / cols; const cellH = height / rows
        for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
          const index = (row * 13 + col * 7 + Math.floor(time / 90)) % m.spectrum.length
          const energy = m.spectrum[index] / 255
          const pulse = (Math.sin(col * .8 + row * 1.4 + time / 700) + 1) * .09
          const light = clamp(.09 + energy * .64 + pulse)
          ctx.fillStyle = `hsl(${285 + ((row + col) % 4) * 20} ${45 + energy * 48}% ${light * 100}%)`
          ctx.fillRect(col * cellW + 1, row * cellH + 1, cellW - 2, cellH - 2)
        }
      }} />
      <div className="rdv-mosaic__copy"><span>PIXEL MOSAIC / {status.toUpperCase()}</span><h1>{data.title}</h1><p>{data.secondary}</p></div>
    </RadioVisualShell>
  )
}
