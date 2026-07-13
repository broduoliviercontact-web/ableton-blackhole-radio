import type { CSSProperties, ReactNode } from 'react'
import { RadioTicker } from '../../splitflap/RadioTicker'
import { accentColor } from '../../splitflap/visual'
import type { RadioVisualProps } from '../radioVisualTypes'

const PALETTE_ACCENTS = {
  amber: '#f5d76b',
  phosphor: '#85ffb3',
  ice: '#85dfff',
  signal: '#ff6a66',
  mono: '#e8eaec',
} as const

interface Props extends Pick<RadioVisualProps, 'data' | 'visual' | 'preview'> {
  className: string
  children: ReactNode
}

export function RadioVisualShell({ className, data, visual, preview, children }: Props) {
  const accent = visual.accentColors[0] ?? PALETTE_ACCENTS[visual.visualPalette] ?? accentColor(visual)
  return (
    <div
      className={`rdv ${className}${preview ? ' rdv--preview' : ''}`}
      style={{ '--rdv-accent': accent, '--rdv-saturation': (0.72 + (visual.visualIntensity / 100) * 0.46).toFixed(2) } as CSSProperties}
    >
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
