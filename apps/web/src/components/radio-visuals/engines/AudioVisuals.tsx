import { VisualCanvas } from '../shared/VisualCanvas'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import { clamp } from '../shared/canvasUtils'
import type { RadioVisualProps } from '../radioVisualTypes'

export function SpectrumWaterfallVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--waterfall" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-waterfall__head"><span>SPECTRUM WATERFALL</span><span>{status.toUpperCase()} / {Math.round(metrics.centroid * 100)}Hz INDEX</span></div>
      <VisualCanvas className="rdv-waterfall__canvas" label="Waterfall spectral audio" metrics={metrics} draw={({ ctx, width, height, time, metrics: m }) => {
        ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, width, height)
        const rows = Math.max(24, Math.round(48 * (visual.visualDensity / 100)))
        const cellHeight = height / rows
        for (let row = 0; row < rows; row += 1) {
          const shift = Math.floor((time / (30 + visual.visualSpeed * 3) + row * 2) % m.spectrum.length)
          for (let bin = 0; bin < m.spectrum.length; bin += 1) {
            const energy = m.spectrum[(bin + shift) % m.spectrum.length] / 255
            const x = (bin / m.spectrum.length) * width
            const value = clamp(energy * (0.5 + row / rows))
            ctx.fillStyle = `hsl(${220 - value * 175} ${55 + value * 45}% ${6 + value * 58}%)`
            ctx.fillRect(x, row * cellHeight, Math.ceil(width / m.spectrum.length) + 1, cellHeight + 1)
          }
        }
      }} />
      <div className="rdv-waterfall__copy"><strong>{data.title}</strong><span>{data.secondary}</span></div>
    </RadioVisualShell>
  )
}

export function StereoOrbitVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--orbit" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-orbit__head"><span>STEREO ORBIT</span><span>WIDTH {Math.round(metrics.stereoWidth * 100)}%</span></div>
      <VisualCanvas className="rdv-orbit__canvas" label="Orbites stereo audio" metrics={metrics} draw={({ ctx, width, height, metrics: m }) => {
        ctx.fillStyle = '#040a0d'; ctx.fillRect(0, 0, width, height)
        const cx = width / 2; const cy = height / 2; const radius = Math.min(width, height) * 0.36
        ctx.strokeStyle = 'rgba(133,224,255,.2)'; ctx.lineWidth = 1
        for (let ring = 1; ring <= 4; ring += 1) { ctx.beginPath(); ctx.arc(cx, cy, radius * ring / 4, 0, Math.PI * 2); ctx.stroke() }
        ctx.strokeStyle = '#85e0ff'; ctx.shadowColor = '#85e0ff'; ctx.shadowBlur = 12 * (visual.visualGlow / 100); ctx.lineWidth = 1.5; ctx.beginPath()
        for (let index = 0; index < m.leftWaveform.length; index += 1) {
          const theta = (index / m.leftWaveform.length) * Math.PI * 2
          const r = radius * (0.32 + Math.abs(m.leftWaveform[index] - m.rightWaveform[index]) * 0.75)
          const x = cx + Math.cos(theta) * r * (0.8 + m.leftWaveform[index] * 0.2)
          const y = cy + Math.sin(theta) * r * (0.8 + m.rightWaveform[index] * 0.2)
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0
      }} />
      <p className="rdv-orbit__title">{data.title} <span>{status.toUpperCase()}</span></p>
    </RadioVisualShell>
  )
}

export function AnalogPersistenceVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  return (
    <RadioVisualShell className="rdv--persistence" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-persistence__head"><span>ANALOG PERSISTENCE</span><span>PEAK {Math.round(metrics.peak * 100)}%</span></div>
      <VisualCanvas className="rdv-persistence__canvas" label="Trace analogique persistante" metrics={metrics} draw={({ ctx, width, height, time, metrics: m }) => {
        ctx.fillStyle = 'rgba(3, 14, 9, .14)'; ctx.fillRect(0, 0, width, height)
        ctx.strokeStyle = 'rgba(99,255,160,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke()
        for (let layer = 0; layer < 4; layer += 1) {
          ctx.strokeStyle = `rgba(124,255,174,${0.18 + layer * .15})`; ctx.lineWidth = 1 + layer * .2; ctx.beginPath()
          for (let index = 0; index < m.waveform.length; index += 1) {
            const x = (index / (m.waveform.length - 1)) * width
            const drift = Math.sin(time / 320 + index / 13 + layer) * layer * 2
            const y = height / 2 + (m.waveform[index] * 0.34 + drift / height) * height
            if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.stroke()
        }
      }} />
      <div className="rdv-persistence__copy"><strong>{data.title}</strong><span>{data.note}</span><em>{status.toUpperCase()}</em></div>
    </RadioVisualShell>
  )
}
