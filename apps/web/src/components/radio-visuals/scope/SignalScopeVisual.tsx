import { VisualCanvas } from '../shared/VisualCanvas'
import { useRadioClock } from '../shared/useRadioClock'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import type { RadioVisualProps } from '../radioVisualTypes'

export function SignalScopeVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const clock = useRadioClock()
  const accent = visual.accentColors[0] ?? '#8affb8'
  return (
    <RadioVisualShell className="rdv--scope" data={data} visual={visual} preview={preview}>
      <div className="rdv-scope__head"><span>BLACKHOLE / SIGNAL SCOPE</span><span>{status.toUpperCase()}</span><span>{clock.toLocaleTimeString('fr-FR', { hour12: false })}</span></div>
      <div className="rdv-scope__screen">
        <VisualCanvas
          className="rdv-scope__canvas"
          label="Oscilloscope audio en temps reel"
          metrics={metrics}
          draw={({ ctx, width, height, metrics: frameMetrics }) => {
            ctx.fillStyle = '#050a08'
            ctx.fillRect(0, 0, width, height)
            ctx.strokeStyle = 'rgba(138, 255, 184, 0.13)'
            ctx.lineWidth = 1
            for (let x = 0; x <= width; x += Math.max(26, width / 12)) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
            for (let y = 0; y <= height; y += Math.max(24, height / 8)) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
            ctx.strokeStyle = accent
            ctx.shadowColor = accent
            ctx.shadowBlur = 13 * (visual.visualGlow / 100)
            ctx.lineWidth = 1.6
            ctx.beginPath()
            for (let index = 0; index < frameMetrics.waveform.length; index += 1) {
              const x = (index / (frameMetrics.waveform.length - 1)) * width
              const y = height / 2 + frameMetrics.waveform[index] * height * 0.36
              if (index === 0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
            ctx.stroke()
            ctx.shadowBlur = 0
          }}
        />
        <div className="rdv-scope__crosshair" />
      </div>
      <div className="rdv-scope__readout">
        <div><span>PROGRAM</span><strong>{data.title}</strong></div>
        <div><span>SOURCE</span><strong>{data.secondary}</strong></div>
        <div><span>RMS</span><strong>{Math.round(metrics.rms * 100)}%</strong></div>
      </div>
    </RadioVisualShell>
  )
}
