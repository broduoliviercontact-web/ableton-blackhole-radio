import type { CSSProperties } from 'react'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import type { RadioVisualProps } from '../radioVisualTypes'

export function KineticTypeVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const words = data.title.split(/\s+/).slice(0, 5)
  return (
    <RadioVisualShell className="rdv--kinetic" data={data} visual={visual} preview={preview}>
      <div className="rdv-kinetic__rail">KINETIC TYPE / {status.toUpperCase()} / BPM {String(Math.round(68 + metrics.rms * 90)).padStart(3, '0')}</div>
      <div className="rdv-kinetic__words" style={{ '--kinetic-drive': `${0.7 + metrics.rms * 2}` } as CSSProperties}>
        {words.map((word, index) => <span key={`${word}-${index}`} style={{ '--word-index': index } as CSSProperties}>{word}</span>)}
      </div>
      <div className="rdv-kinetic__bottom"><strong>{data.secondary}</strong><p>{data.note}</p></div>
    </RadioVisualShell>
  )
}

export function TapeMachineVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const speed = 4 + metrics.rms * 10
  return (
    <RadioVisualShell className="rdv--tape" data={data} visual={visual} preview={preview}>
      <div className="rdv-tape__top"><span>BLACKHOLE TAPE MACHINE</span><span>{status.toUpperCase()} / {metrics.simulated ? 'CUE' : 'REC'}</span></div>
      <div className="rdv-tape__deck">
        <div className="rdv-tape__reel" style={{ '--reel-speed': `${speed}s` } as CSSProperties}><i /><b /></div>
        <div className="rdv-tape__label"><span>A</span><strong>{data.title}</strong><small>{data.secondary}</small></div>
        <div className="rdv-tape__reel rdv-tape__reel--right" style={{ '--reel-speed': `${speed * .92}s` } as CSSProperties}><i /><b /></div>
      </div>
      <div className="rdv-tape__counter">{String(Math.round(metrics.now / 1000) % 60).padStart(2, '0')}:{String(Math.round(metrics.rms * 99)).padStart(2, '0')} // {data.note}</div>
    </RadioVisualShell>
  )
}
