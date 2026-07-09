import { useEffect, useRef, useState } from 'react'

// Stats débit audio WebRTC côté listener : trafic réseau ENTRANT reçu par ce
// navigateur (kbps / jitter / loss). ≠ niveau sonore (ça c'est l'Audio Monitor).
// Source : RTCStatsReport du receiver audio (livekit-client RemoteTrack.getRTCStatsReport).

export interface AudioRxSnapshot {
  bytesReceived: number
  packetsReceived: number
  packetsLost: number
  jitter: number // secondes (brut RTCInboundRtpStreamStats)
  timestamp: number // ms (high-res)
}

export interface AudioRxDisplay {
  available: boolean
  kbps: number | null // null = premier poll (pas encore de delta)
  jitterMs: number | null
  lossPct: number | null // 1 décimale
  packetsReceived: number
  packetsLost: number
}

export const IDLE_RX: AudioRxDisplay = {
  available: false,
  kbps: null,
  jitterMs: null,
  lossPct: null,
  packetsReceived: 0,
  packetsLost: 0,
}

// Champs lus sur un rapport inbound-rtp audio (RTCRtpStreamStats). `mediaType`
// est deprecated mais reste présent sur certains navigateurs — on regarde les deux.
interface InboundAudioStats {
  type: string
  kind?: string
  mediaType?: string
  bytesReceived?: number
  packetsReceived?: number
  packetsLost?: number
  jitter?: number
  timestamp?: number
}

// Calcul pur depuis un RTCStatsReport + l'instantané précédent (pour le delta de
// bitrate). Séparé du hook pour être testé hors navigateur. Renvoie le nouvel
// instantané (à mémoriser) + l'affichage calculé.
export function computeAudioRx(
  report: RTCStatsReport,
  prev: AudioRxSnapshot | null,
): { snapshot: AudioRxSnapshot | null; display: AudioRxDisplay } {
  // Collecté dans un tableau (mutation dans la closure forEach) — éviter le
  // narrowing TS d'un `let snap = null` qui rendrait la lecture post-boucle
  // `never`. On garde le premier inbound-rtp audio trouvé.
  const found: AudioRxSnapshot[] = []
  report.forEach((s) => {
    const st = s as unknown as InboundAudioStats
    if (st.type !== 'inbound-rtp') return
    if (st.kind !== 'audio' && st.mediaType !== 'audio') return
    if (found.length > 0) return
    found.push({
      bytesReceived: st.bytesReceived ?? 0,
      packetsReceived: st.packetsReceived ?? 0,
      packetsLost: st.packetsLost ?? 0,
      jitter: st.jitter ?? 0,
      timestamp: st.timestamp ?? 0,
    })
  })
  const snap = found[0] ?? null
  if (!snap) return { snapshot: null, display: IDLE_RX }

  let kbps: number | null = null
  if (prev && snap.timestamp > prev.timestamp) {
    const dBytes = snap.bytesReceived - prev.bytesReceived
    const dSec = (snap.timestamp - prev.timestamp) / 1000
    if (dSec > 0 && dBytes >= 0) kbps = Math.max(0, Math.round((dBytes * 8) / dSec / 1000))
  }
  const total = snap.packetsReceived + snap.packetsLost
  const lossPct100 = total > 0 ? (snap.packetsLost / total) * 100 : 0
  return {
    snapshot: snap,
    display: {
      available: true,
      kbps,
      jitterMs: Math.round(snap.jitter * 1000),
      lossPct: Math.round(lossPct100 * 10) / 10,
      packetsReceived: snap.packetsReceived,
      packetsLost: snap.packetsLost,
    },
  }
}

// Poll le rapport WebRTC toutes les 1.5 s quand `active` (phase listening).
// `getReport` est lu via ref (stable : pas de re-création de l'interval à chaque
// rendu). Reset propre à l'arrêt ; stats se reconnectent quand un nouveau track
// arrive (le getter lit la piste courante). Ne crash pas si getStats absent.
export function useAudioReceiverStats(
  getReport: () => Promise<RTCStatsReport | undefined>,
  active: boolean,
): AudioRxDisplay {
  const getReportRef = useRef(getReport)
  getReportRef.current = getReport
  const prevRef = useRef<AudioRxSnapshot | null>(null)
  const [display, setDisplay] = useState<AudioRxDisplay>(IDLE_RX)

  useEffect(() => {
    if (!active) {
      prevRef.current = null
      setDisplay(IDLE_RX)
      return
    }
    let cancelled = false
    const tick = async (): Promise<void> => {
      try {
        const report = await getReportRef.current()
        if (cancelled) return
        if (!report) {
          setDisplay(IDLE_RX)
          return
        }
        const { snapshot, display: d } = computeAudioRx(report, prevRef.current)
        prevRef.current = snapshot
        setDisplay(d)
      } catch {
        if (!cancelled) setDisplay(IDLE_RX)
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 1500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [active])

  return display
}