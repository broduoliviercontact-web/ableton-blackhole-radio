import { RadioVisualShell } from '../shared/RadioVisualShell'
import type { RadioVisualProps } from '../radioVisualTypes'

const GLYPHS = ' .:*#@'

function asciiField(props: RadioVisualProps): string {
  const columns = 58
  const rows = 14
  const lines: string[] = []
  for (let row = 0; row < rows; row += 1) {
    let line = ''
    for (let column = 0; column < columns; column += 1) {
      const bin = props.metrics.spectrum[Math.floor((column / columns) * props.metrics.spectrum.length)] / 255
      const crest = Math.sin(column / 6 + props.metrics.now / 900) * (2 + bin * 4) + rows / 2
      const proximity = Math.max(0, 1 - Math.abs(row - crest) / (1.2 + bin * 4))
      const amount = Math.min(1, proximity * 0.8 + bin * 0.44)
      line += GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(amount * GLYPHS.length))]
    }
    lines.push(line)
  }
  return lines.join('\n')
}

export function AsciiWaveVisual(props: RadioVisualProps) {
  const { data, status, visual, preview } = props
  return (
    <RadioVisualShell className="rdv--ascii" data={data} visual={visual} preview={preview}>
      <div className="rdv-ascii__head"><span>ASCII MODULATOR</span><span>{status.toUpperCase()} / CH 00.00</span></div>
      <div className="rdv-ascii__content">
        <pre className="rdv-ascii__field" aria-label="Onde audio convertie en caracteres">{asciiField(props)}</pre>
        <div className="rdv-ascii__copy">
          <p className="rdv-eyebrow">NOW TRANSMITTING</p>
          <h1>{data.title}</h1>
          <p className="rdv-ascii__secondary">{data.secondary}</p>
          <p className="rdv-ascii__note">{data.note}</p>
        </div>
      </div>
    </RadioVisualShell>
  )
}
