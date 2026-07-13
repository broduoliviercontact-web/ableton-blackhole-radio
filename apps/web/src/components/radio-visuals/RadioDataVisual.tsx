import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { BroadcastInput, BroadcastMessage } from '../../api/broadcastMessage'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { RadioTicker } from '../splitflap/RadioTicker'
import { accentColor, type ResolvedVisual } from '../splitflap/visual'
import './radio-visuals.css'

type RadioMessage = BroadcastInput | BroadcastMessage | null
interface Props {
  kind: ResolvedVisual['visualization']
  message: RadioMessage
  visual: ResolvedVisual
  status: 'live' | 'connecting' | 'offline' | 'preview'
  analyser?: ListenerAudioAnalyser
  preview?: boolean
}

const FALLBACK_TITLE = 'RADIO BLACKHOLE'
const FALLBACK_NOTE = 'EN ATTENTE D UNE TRANSMISSION.'

function messageData(message: RadioMessage) {
  const title = message?.mainTitle?.trim() || FALLBACK_TITLE
  const secondary = [message?.subtitle, message?.artist, message?.album].filter(Boolean).join(' // ') || 'LIVE WEB AUDIO STREAM'
  const note = message?.note?.trim() || FALLBACK_NOTE
  const ticker = message?.ticker?.trim() || 'RADIO BLACKHOLE · PIRATE WEBRTC STREAM · LISTEN LIVE'
  return { title, secondary, note, ticker }
}

function useClock() {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return clock
}

function useAsciiField(analyser?: ListenerAudioAnalyser, preview = false): string {
  const [field, setField] = useState('')
  useEffect(() => {
    const columns = 58
    const rows = 14
    let frame = 0
    const draw = () => {
      const bins = analyser?.mainAnalyser
      const spectrum = bins ? new Uint8Array(bins.frequencyBinCount) : null
      if (spectrum && bins) bins.getByteFrequencyData(spectrum)
      const lines: string[] = []
      for (let row = 0; row < rows; row += 1) {
        let line = ''
        for (let col = 0; col < columns; col += 1) {
          const index = Math.floor((col / columns) * (spectrum?.length ?? 256))
          const audio = spectrum ? spectrum[index] / 255 : 0.26 + Math.sin(frame / 7 + col / 8) * 0.16
          const crest = Math.sin(col / 6 + frame / 9) * 3 + rows / 2
          const distance = Math.abs(row - crest)
          const threshold = Math.max(0, 1 - distance / (1 + audio * 8))
          const noise = (Math.sin(col * 19 + row * 11 + frame * 0.7) + 1) / 2
          const level = Math.min(1, threshold * 0.85 + audio * 0.48 + noise * 0.08)
          line += level > 0.82 ? '@' : level > 0.64 ? '#' : level > 0.48 ? '*' : level > 0.3 ? ':' : level > 0.18 ? '.' : ' '
        }
        lines.push(line)
      }
      setField(lines.join('\n'))
      frame += preview ? 1.4 : 1
    }
    draw()
    const id = window.setInterval(draw, preview ? 95 : 125)
    return () => window.clearInterval(id)
  }, [analyser, preview])
  return field
}

function ScopeCanvas({ analyser, accent }: { analyser?: ListenerAudioAnalyser; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    let animation = 0
    let previous = 0
    const render = (time: number) => {
      animation = requestAnimationFrame(render)
      if (time - previous < 33) return
      previous = time
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(rect.width * ratio))
      const height = Math.max(1, Math.floor(rect.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      const w = rect.width
      const h = rect.height
      context.fillStyle = '#050a08'
      context.fillRect(0, 0, w, h)
      context.strokeStyle = 'rgba(138, 255, 184, 0.13)'
      context.lineWidth = 1
      for (let x = 0; x <= w; x += Math.max(26, w / 12)) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, h)
        context.stroke()
      }
      for (let y = 0; y <= h; y += Math.max(24, h / 8)) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(w, y)
        context.stroke()
      }
      const node = analyser?.mainAnalyser
      const samples = node ? new Uint8Array(node.fftSize) : null
      if (samples && node) node.getByteTimeDomainData(samples)
      context.strokeStyle = accent
      context.shadowColor = accent
      context.shadowBlur = 13
      context.lineWidth = 1.6
      context.beginPath()
      const count = samples?.length ?? 256
      for (let i = 0; i < count; i += 1) {
        const x = (i / (count - 1)) * w
        const value = samples ? (samples[i] - 128) / 128 : Math.sin(i / 12 + frame / 5) * (0.16 + Math.sin(frame / 15) * 0.06)
        const y = h / 2 + value * h * 0.36
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()
      context.shadowBlur = 0
      context.fillStyle = 'rgba(5, 10, 8, 0.075)'
      context.fillRect(0, 0, w, h)
      frame += 1
    }
    animation = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animation)
  }, [analyser, accent])

  return <canvas ref={canvasRef} className="rdv-scope__canvas" aria-label="Oscilloscope audio en temps reel" role="img" />
}

function CrtTerminal({ data, status, visual, preview }: Omit<Props, 'kind' | 'analyser'> & { data: ReturnType<typeof messageData> }) {
  const clock = useClock()
  return (
    <div className={`rdv rdv--crt${preview ? ' rdv--preview' : ''}`} style={{ '--rdv-accent': accentColor(visual) } as CSSProperties}>
      <div className="rdv-crt__bezel">
        <div className="rdv-crt__topline"><span>BH/OS 2.6</span><span>UPLINK {status.toUpperCase()}</span><span>{clock.toLocaleTimeString('fr-FR', { hour12: false })}</span></div>
        <div className="rdv-crt__signal">SIGNAL RECEIVED <span aria-hidden="true">////</span></div>
        <h1>{data.title}</h1>
        <p className="rdv-crt__secondary">{data.secondary}</p>
        <div className="rdv-crt__divider" />
        <p className="rdv-crt__note">{data.note}</p>
        <p className="rdv-crt__prompt">root@blackhole:~$ <span>_</span></p>
      </div>
      <RadioTicker text={data.ticker} enabled={visual.tickerEnabled} speedMs={visual.tickerSpeedMs} direction={visual.tickerDirection} separator={visual.tickerSeparator} />
    </div>
  )
}

function AsciiWave({ data, status, visual, analyser, preview }: Omit<Props, 'kind'> & { data: ReturnType<typeof messageData> }) {
  const field = useAsciiField(analyser, preview)
  return (
    <div className={`rdv rdv--ascii${preview ? ' rdv--preview' : ''}`} style={{ '--rdv-accent': accentColor(visual) } as CSSProperties}>
      <div className="rdv-ascii__head"><span>ASCII MODULATOR</span><span>{status.toUpperCase()} / CH 00.00</span></div>
      <div className="rdv-ascii__content">
        <pre className="rdv-ascii__field" aria-label="Onde audio convertie en caracteres">{field}</pre>
        <div className="rdv-ascii__copy">
          <p className="rdv-eyebrow">NOW TRANSMITTING</p>
          <h1>{data.title}</h1>
          <p className="rdv-ascii__secondary">{data.secondary}</p>
          <p className="rdv-ascii__note">{data.note}</p>
        </div>
      </div>
      <RadioTicker text={data.ticker} enabled={visual.tickerEnabled} speedMs={visual.tickerSpeedMs} direction={visual.tickerDirection} separator={visual.tickerSeparator} />
    </div>
  )
}

function SignalScope({ data, status, visual, analyser, preview }: Omit<Props, 'kind'> & { data: ReturnType<typeof messageData> }) {
  const clock = useClock()
  const accent = accentColor(visual)
  return (
    <div className={`rdv rdv--scope${preview ? ' rdv--preview' : ''}`} style={{ '--rdv-accent': accent } as CSSProperties}>
      <div className="rdv-scope__head"><span>BLACKHOLE / SIGNAL SCOPE</span><span>{status.toUpperCase()}</span><span>{clock.toLocaleTimeString('fr-FR', { hour12: false })}</span></div>
      <div className="rdv-scope__screen"><ScopeCanvas analyser={analyser} accent={accent} /><div className="rdv-scope__crosshair" /></div>
      <div className="rdv-scope__readout">
        <div><span>PROGRAM</span><strong>{data.title}</strong></div>
        <div><span>SOURCE</span><strong>{data.secondary}</strong></div>
        <div><span>MESSAGE</span><strong>{data.note}</strong></div>
      </div>
      <RadioTicker text={data.ticker} enabled={visual.tickerEnabled} speedMs={visual.tickerSpeedMs} direction={visual.tickerDirection} separator={visual.tickerSeparator} />
    </div>
  )
}

/** Moteurs alternatifs de la page publique. Split-flap reste rendu par son
 * composant dedie pour conserver son comportement mecanique existant. */
export function RadioDataVisual({ kind, message, visual, status, analyser, preview = false }: Props) {
  const data = messageData(message)
  if (kind === 'crt-terminal') return <CrtTerminal data={data} visual={visual} status={status} preview={preview} message={message} />
  if (kind === 'ascii-wave') return <AsciiWave data={data} visual={visual} status={status} analyser={analyser} preview={preview} message={message} />
  return <SignalScope data={data} visual={visual} status={status} analyser={analyser} preview={preview} message={message} />
}
