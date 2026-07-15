import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { getEffectiveVolume } from '../audio/listenerVolume'
import type { ListenerAudioAnalyser } from '../audio/listenerAnalysis'
import type { ListenerPlaybackControls } from './useListenerPlaybackControls'
import type { ListenPhase } from './useLiveKitListen'

interface UseIcecastListenResult {
  phase: ListenPhase
  error: string | null
  lost: boolean
  reconnecting: boolean
  needGesture: boolean
  listenerVolume: number
  muted: boolean
  trimMinus30Db: boolean
  listenLive: () => Promise<void>
  stopListening: () => void
  reconnect: () => Promise<void>
  startAudio: () => Promise<void>
  setListenerVolume: (volumePercent: number) => void
  toggleMute: () => void
  toggleTrimMinus30Db: () => void
  getAudioRxReport: () => Promise<RTCStatsReport | undefined>
}

interface UseIcecastListenOptions {
  streamUrl: string
  audioHostRef: RefObject<HTMLDivElement | null>
  analyser?: ListenerAudioAnalyser | null
  playback: ListenerPlaybackControls
}

export function useIcecastListen({
  streamUrl,
  audioHostRef,
  analyser,
  playback,
}: UseIcecastListenOptions): UseIcecastListenResult {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startingRef = useRef(false)
  const userStoppedRef = useRef(false)
  const [phase, setPhase] = useState<ListenPhase>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [lost, setLost] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [needGesture, setNeedGesture] = useState(false)

  const effectiveVolume = getEffectiveVolume(playback.listenerVolume, playback.trimMinus30Db)

  const ensureAudioElement = useCallback(() => {
    if (audioRef.current) return audioRef.current
    const el = document.createElement('audio')
    el.crossOrigin = 'anonymous'
    el.preload = 'none'
    el.controls = false
    el.autoplay = false
    el.addEventListener('playing', () => {
      setPhase('listening')
      setLost(false)
      setReconnecting(false)
      setNeedGesture(false)
    })
    el.addEventListener('waiting', () => {
      if (!userStoppedRef.current) setPhase((prev) => (prev === 'listening' ? 'listening' : 'connecting'))
    })
    el.addEventListener('stalled', () => {
      if (!userStoppedRef.current) setLost(true)
    })
    el.addEventListener('error', () => {
      if (userStoppedRef.current) return
      setLost(true)
      setPhase('error')
      setError('Flux Icecast indisponible. Réessayez.')
    })
    audioHostRef.current?.appendChild(el)
    audioRef.current = el
    return el
  }, [audioHostRef])

  const cleanup = useCallback((markStopped: boolean) => {
    if (markStopped) userStoppedRef.current = true
    const el = audioRef.current
    if (!el) return
    try {
      el.pause()
      analyser?.removeMediaElement(el)
      el.removeAttribute('src')
      el.load()
      el.remove()
    } catch {
      // élément déjà nettoyé
    }
    audioRef.current = null
  }, [analyser])

  const listenLive = useCallback(async () => {
    if (startingRef.current) return
    if (!streamUrl) {
      setPhase('error')
      setError('URL Icecast non configurée.')
      return
    }
    startingRef.current = true
    userStoppedRef.current = false
    setPhase('connecting')
    setError(null)
    setLost(false)
    setReconnecting(false)
    setNeedGesture(false)
    try {
      const el = ensureAudioElement()
      if (el.src !== streamUrl) {
        el.src = streamUrl
        el.load()
      }
      analyser?.addMediaElement(el, effectiveVolume)
      await el.play()
      setPhase('listening')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        setNeedGesture(true)
        setPhase('connected')
      } else {
        setPhase('error')
        setError(e instanceof Error ? e.message : String(e))
        cleanup(false)
      }
    } finally {
      startingRef.current = false
    }
  }, [analyser, cleanup, effectiveVolume, ensureAudioElement, streamUrl])

  const stopListening = useCallback(() => {
    cleanup(true)
    setPhase('disconnected')
    setLost(false)
    setReconnecting(false)
    setNeedGesture(false)
  }, [cleanup])

  const reconnect = useCallback(async () => {
    setReconnecting(true)
    cleanup(false)
    await listenLive()
  }, [cleanup, listenLive])

  const startAudio = useCallback(async () => {
    const el = audioRef.current
    if (!el) {
      await listenLive()
      return
    }
    try {
      analyser?.addMediaElement(el, effectiveVolume)
      await el.play()
      setNeedGesture(false)
      setPhase('listening')
    } catch {
      setNeedGesture(true)
    }
  }, [analyser, effectiveVolume, listenLive])

  const setListenerVolume = useCallback((volumePercent: number) => {
    playback.setListenerVolume(volumePercent)
  }, [playback])

  const toggleMute = useCallback(() => {
    playback.toggleMute()
  }, [playback])

  const toggleTrimMinus30Db = useCallback(() => {
    playback.toggleTrimMinus30Db()
  }, [playback])

  useEffect(() => {
    const el = audioRef.current
    if (el) analyser?.setMediaElementGain(el, effectiveVolume)
  }, [analyser, effectiveVolume])

  useEffect(() => {
    return () => cleanup(true)
  }, [cleanup])

  return {
    phase,
    error,
    lost,
    reconnecting,
    needGesture,
    listenerVolume: playback.listenerVolume,
    muted: playback.muted,
    trimMinus30Db: playback.trimMinus30Db,
    listenLive,
    stopListening,
    reconnect,
    startAudio,
    setListenerVolume,
    toggleMute,
    toggleTrimMinus30Db,
    getAudioRxReport: async () => undefined,
  }
}
