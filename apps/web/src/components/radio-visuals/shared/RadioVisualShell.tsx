import type { CSSProperties, ReactNode } from 'react'
import { RadioTicker } from '../../splitflap/RadioTicker'
import { accentColor } from '../../splitflap/visual'
import type { RadioMetrics, RadioVisualProps } from '../radioVisualTypes'

const PALETTE_ACCENTS = {
  amber: '#f5d76b',
  phosphor: '#85ffb3',
  ice: '#85dfff',
  signal: '#ff6a66',
  mono: '#e8eaec',
} as const

interface Props extends Pick<RadioVisualProps, 'data' | 'visual' | 'preview'> {
  className: string
  metrics: RadioMetrics
  children: ReactNode
}

export function RadioVisualShell({ className, data, visual, metrics, preview, children }: Props) {
  const accent = visual.accentColors[0] ?? PALETTE_ACCENTS[visual.visualPalette] ?? accentColor(visual)
  const energy = Math.min(1, metrics.rms * 3.2)
  const peak = Math.min(1, metrics.peak)
  const meter = Array.from({ length: 12 }, (_, index) => metrics.spectrum[Math.floor((index / 12) * metrics.spectrum.length)] / 255)
  return (
    <div
      className={`rdv ${className}${preview ? ' rdv--preview' : ''}${metrics.active ? ' rdv--audio-active' : ' rdv--audio-simulated'}`}
      style={{
        '--rdv-accent': accent,
        '--rdv-saturation': (0.72 + (visual.visualIntensity / 100) * 0.46).toFixed(2),
        '--rdv-frame-alpha': `${Math.round(28 + energy * 52)}%`,
        '--rdv-frame-glow': `${Math.round(5 + peak * 22)}px`,
        '--rdv-energy': energy.toFixed(3),
      } as CSSProperties}
    >
      <div className="rdv-audio-bus" aria-hidden="true">
        {meter.map((value, index) => <i key={index} style={{ height: `${2 + value * 20}px`, opacity: (0.26 + value * 0.74).toFixed(2) } as CSSProperties} />)}
      </div>
      {children}
      <RadioTicker
        text={data.ticker}
        enabled={visual.tickerEnabled}
        speedMs={visual.tickerSpeedMs}
        direction={visual.tickerDirection}
        separator={visual.tickerSeparator}
      />
    </div>
  )
}
