import { VisualCanvas } from '../shared/VisualCanvas'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import type { RadioVisualProps } from '../radioVisualTypes'

function compact(value: string, size: number): string { return value.toUpperCase().replace(/[^A-Z0-9 .:/-]/g, ' ').slice(0, size) }

export function TeletextVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const level = Math.round(metrics.rms * 100)
  return (
    <RadioVisualShell className="rdv--teletext" data={data} visual={visual} metrics={metrics} preview={preview}>
      <header className="rdv-teletext__bar"><span>BHX/CEEFAX 2026</span><span>P.101 {status.toUpperCase()}</span></header>
      <div className="rdv-teletext__content">
        <p className="rdv-teletext__kicker">RADIO BLACKHOLE // LIVE DATA SERVICE</p>
        <h1>{data.title}</h1>
        <p className="rdv-teletext__secondary">{data.secondary}</p>
        <div className="rdv-teletext__grid"><span>UPLINK</span><b>{metrics.simulated ? 'STANDBY' : 'LOCKED'}</b><span>LEVEL</span><b>{level.toString().padStart(2, '0')}%</b><span>MODE</span><b>{data.type.toUpperCase()}</b></div>
        <p className="rdv-teletext__note">{data.note}</p>
      </div>
    </RadioVisualShell>
  )
}

export function DotMatrixVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const dots = Array.from({ length: Math.max(32, Math.round(72 * (visual.visualDensity / 100))) }, (_, index) => Math.round(metrics.spectrum[index % metrics.spectrum.length] / 64))
  return (
    <RadioVisualShell className="rdv--dotmatrix" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-dotmatrix__head"><span>DOT MATRIX // {status.toUpperCase()}</span><span>PEAK {Math.round(metrics.peak * 100)}%</span></div>
      <div className="rdv-dotmatrix__title">{compact(data.title, 28)}</div>
      <div className="rdv-dotmatrix__sub">{compact(data.secondary, 48)}</div>
      <div className="rdv-dotmatrix__dots" aria-hidden="true">{dots.map((dot, index) => <i key={index} data-level={dot} />)}</div>
      <p className="rdv-dotmatrix__note">{data.note}</p>
    </RadioVisualShell>
  )
}

export function PacketStreamVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const words = `${data.ticker} // ${data.title} // ${data.secondary}`.split(/\s+/).filter(Boolean)
  return (
    <RadioVisualShell className="rdv--packets" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-packets__head"><span>PACKET STREAM</span><span>RX {metrics.simulated ? 'SIM' : 'LIVE'} / {status.toUpperCase()}</span></div>
      <VisualCanvas
        className="rdv-packets__canvas"
        label="Flux de paquets radio"
        metrics={metrics}
        draw={({ ctx, width, height, time, metrics: frameMetrics }) => {
          ctx.fillStyle = '#080b10'; ctx.fillRect(0, 0, width, height)
          const count = Math.max(10, Math.round(20 + visual.visualDensity / 4))
          ctx.font = '12px ui-monospace, monospace'
          for (let index = 0; index < count; index += 1) {
            const lane = (index * 37) % Math.max(1, height - 20)
            const x = ((time * (0.035 + (index % 4) * 0.012) + index * 173) % (width + 190)) - 160
            const energy = frameMetrics.spectrum[(index * 7) % frameMetrics.spectrum.length] / 255
            ctx.fillStyle = `rgba(245,215,107,${0.22 + energy * 0.78})`
            ctx.fillText(`[${String(index).padStart(3, '0')}] ${words[index % words.length] ?? 'BHX'}`, x, lane + 15)
          }
        }}
      />
      <p className="rdv-packets__title">{data.title}</p>
    </RadioVisualShell>
  )
}
