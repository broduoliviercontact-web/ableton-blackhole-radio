import { useRadioClock } from '../shared/useRadioClock'
import { RadioVisualShell } from '../shared/RadioVisualShell'
import type { RadioVisualProps } from '../radioVisualTypes'

export function CrtTerminalVisual({ data, status, visual, metrics, preview }: RadioVisualProps) {
  const clock = useRadioClock()
  return (
    <RadioVisualShell className="rdv--crt" data={data} visual={visual} metrics={metrics} preview={preview}>
      <div className="rdv-crt__bezel">
        <div className="rdv-crt__topline"><span>BH/OS 2.6</span><span>UPLINK {status.toUpperCase()}</span><span>{clock.toLocaleTimeString('fr-FR', { hour12: false })}</span></div>
        <div className="rdv-crt__signal">SIGNAL RECEIVED <span aria-hidden="true">////</span></div>
        <h1>{data.title}</h1>
        <p className="rdv-crt__secondary">{data.secondary}</p>
        <div className="rdv-crt__divider" />
        <p className="rdv-crt__note">{data.note}</p>
        <p className="rdv-crt__prompt">root@blackhole:~$ <span>_</span></p>
      </div>
    </RadioVisualShell>
  )
}
