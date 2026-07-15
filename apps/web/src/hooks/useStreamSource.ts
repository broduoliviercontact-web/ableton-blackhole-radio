import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_STREAM_SOURCE_STATE,
  fetchStreamSource,
  putStreamSource,
  type StreamSource,
  type StreamSourceState,
} from '../api/streamSource'

const DEFAULT_POLL_MS = 5000

export function useStreamSource(pollMs = DEFAULT_POLL_MS) {
  const [state, setState] = useState<StreamSourceState>(DEFAULT_STREAM_SOURCE_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await fetchStreamSource()
      setState(next)
      setError(null)
      return next
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const next = await fetchStreamSource()
        if (!cancelled) {
          setState(next)
          setError(null)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setLoading(false)
        }
      }
    }
    void poll()
    timerRef.current = window.setInterval(poll, pollMs)
    return () => {
      cancelled = true
      if (timerRef.current != null) clearInterval(timerRef.current)
    }
  }, [pollMs])

  const update = useCallback(async (activeSource: StreamSource, performerPassword: string) => {
    const next = await putStreamSource(activeSource, performerPassword)
    setState(next)
    setError(null)
    return next
  }, [])

  return { state, loading, error, refresh, update }
}
