import { useEffect, useRef, useState } from 'react'
import { fetchBroadcastMessage, type BroadcastMessage } from '../api/broadcastMessage'

// Message par défaut affiché tant qu'aucun message performer n'est publié.
export const DEFAULT_BROADCAST_MESSAGE: BroadcastMessage = {
  type: 'announcement',
  mainTitle: 'RADIO BLACKHOLE',
  subtitle: 'LIVE WEB AUDIO STREAM',
  note: 'En attente du message performer.',
  ticker: 'RADIO ONLINE · LISTEN LIVE',
  updatedAt: '',
}

const POLL_MS = 5000

/**
 * Récupère le message broadcast courant (GET /api/broadcast-message) au
 * montage puis poll toutes les 5 s (MVP — plus tard : LiveKit data channel).
 * `display` = message serveur ou le message par défaut.
 */
export function useBroadcastMessage() {
  const [message, setMessage] = useState<BroadcastMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const m = await fetchBroadcastMessage()
        if (!cancelled) {
          setMessage(m)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    poll()
    timerRef.current = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      if (timerRef.current != null) clearInterval(timerRef.current)
    }
  }, [])

  return { message, display: message ?? DEFAULT_BROADCAST_MESSAGE, loading }
}