import type { CSSProperties } from 'react'
import type { AudioRxDisplay } from '../audio/audioReceiverStats'

interface Props {
  rx: AudioRxDisplay
  active: boolean
}

const TOOLTIP =
  'Débit audio WebRTC reçu par ce navigateur. Ce n’est pas le niveau sonore, c’est le trafic réseau entrant.'

/**
 * Indicateur compact du débit audio reçu (côté listener) : kbps · jitter · loss.
 * États : EN ATTENTE AUDIO (pas connecté) · RX — (connecté mais stats
 * indisponibles) · RX 78 kbps · jitter 12 ms · loss 0.0 %. Toujours rendu dans la
 * barre de contrôles ; discret quand pas de flux.
 */
export function AudioRxStats({ rx, active }: Props) {
  let text: string
  if (!active) text = 'EN ATTENTE AUDIO'
  else if (!rx.available) text = 'RX —'
  else
    text = `RX ${rx.kbps ?? '—'} kbps · jitter ${rx.jitterMs ?? '—'} ms · loss ${
      rx.lossPct != null ? rx.lossPct.toFixed(1) : '—'
    } %`

  return (
    <span style={style} title={`${text}\n${TOOLTIP}`}>
      {text}
    </span>
  )
}

const style: CSSProperties = {
  fontFamily: 'var(--mono, ui-monospace, Consolas, monospace)',
  fontSize: 12,
  letterSpacing: 1,
  color: '#9ca3af',
  whiteSpace: 'nowrap',
  cursor: 'help',
}