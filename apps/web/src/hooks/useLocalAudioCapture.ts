import { useCallback, useEffect, useRef, useState } from 'react'

export type CaptureStatus = 'idle' | 'capturing' | 'error'

interface UseLocalAudioCaptureResult {
  stream: MediaStream | null
  status: CaptureStatus
  error: string | null
  deviceLabel: string | null
  start: (deviceId: string) => Promise<void>
  stop: () => void
}

function mapCaptureError(e: unknown): string {
  if (e instanceof DOMException) {
    switch (e.name) {
      case 'NotAllowedError':
        return 'Permission micro refusée. Autorisez l’accès dans le navigateur.'
      case 'NotFoundError':
        return 'Aucun périphérique audio trouvé.'
      case 'NotReadableError':
        return 'Périphérique audio illisible (peut-être déjà utilisé par une autre app).'
      case 'OverconstrainedError':
        return 'Contraintes non satisfaites (device/sampleRate). Essayez une autre entrée.'
      case 'SecurityError':
        return 'Contexte non sécurisé : getUserMedia exige HTTPS ou localhost.'
      default:
        return `Erreur capture : ${e.name}`
    }
  }
  return e instanceof Error ? e.message : 'Erreur capture inconnue.'
}

/**
 * Capture un device d'entrée avec contraintes "musique" (pas de traitement voix).
 * Stoppe l'ancien stream au redémarrage ou au changement de device.
 */
export function useLocalAudioCapture(): UseLocalAudioCaptureResult {
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null)

  const stop = useCallback(() => {
    const s = streamRef.current
    if (s) for (const t of s.getTracks()) t.stop()
    streamRef.current = null
    setStream(null)
    setStatus('idle')
  }, [])

  const start = useCallback(async (deviceId: string) => {
    // stoppe l'ancien stream avant d'en démarrer un nouveau
    const prev = streamRef.current
    if (prev) for (const t of prev.getTracks()) t.stop()
    streamRef.current = null
    setError(null)

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
          sampleRate: 48000,
        },
        video: false,
      })
      streamRef.current = s
      setStream(s)
      setStatus('capturing')
      setDeviceLabel(s.getAudioTracks()[0]?.label ?? null)
    } catch (e) {
      setStream(null)
      setStatus('error')
      setError(mapCaptureError(e))
    }
  }, [])

  // libère le stream au démontage
  useEffect(() => () => stop(), [stop])

  return { stream, status, error, deviceLabel, start, stop }
}