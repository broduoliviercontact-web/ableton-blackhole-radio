import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Room, RoomEvent, isAudioTrack } from 'livekit-client'
import type { RemoteAudioTrack, RemoteTrack } from 'livekit-client'
import { connectToRoom } from '../livekit/livekitClient'
import { getEffectiveVolume } from '../audio/listenerVolume'
import type { ListenerAudioAnalyser } from '../audio/listenerAnalysis'

export type ListenPhase = 'disconnected' | 'connecting' | 'connected' | 'listening' | 'error'

interface UseLiveKitListenResult {
  phase: ListenPhase
  error: string | null
  identity: string
  roomName: string
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
  // Rapport stats WebRTC du receiver audio entrant (inbound-rtp). Utilisé par
  // useAudioReceiverStats pour afficher le débit reçu (kbps/jitter/loss).
  getAudioRxReport: () => Promise<RTCStatsReport | undefined>
}

const MAX_ATTEMPTS = 3

/**
 * Listener raw livekit-client (US-3.1) : on ne dépend plus de
 * @livekit/components-react (double instance React en monorepo → "Invalid hook
 * call"). La room est gérée ici : fetch token → room.connect → on attache les
 * pistes audio distantes à des <audio> dans le conteneur fourni.
 * Reconnexion simple (3 tentatives, backoff 1s/2s/4s) après déconnexion
 * inattendue ; bouton Reconnect manuel si épuisées (US-4.1).
 */
export function useLiveKitListen(
  roomName: string,
  identity: string,
  audioHostRef: RefObject<HTMLDivElement | null>,
  analyser?: ListenerAudioAnalyser | null,
): UseLiveKitListenResult {
  const startingRef = useRef(false)
  const userStoppedRef = useRef(false)
  const attemptsRef = useRef(0)
  const retryTimer = useRef<number | null>(null)
  const roomRef = useRef<Room | null>(null)
  const audioEls = useRef<Map<RemoteAudioTrack, HTMLAudioElement>>(new Map())
  // Ref stable vers connect() pour le retry interne (évite la ref circulaire).
  const connectRef = useRef<() => Promise<void>>(async () => {})
  // Volume listener local (0–100). Ref pour que attachTrack (callback stable)
  // lise la valeur courante sans re-création ; state pour l'UI.
  const listenerVolumeRef = useRef(100)
  const preMuteRef = useRef(100)
  // Trim PAD -30 dB : ref (lu par attachTrack sans re-création) + state (UI).
  const trimMinus30DbRef = useRef(false)

  const [phase, setPhase] = useState<ListenPhase>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [lost, setLost] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [needGesture, setNeedGesture] = useState(false)
  const [listenerVolume, setListenerVolumeState] = useState(100)
  const [muted, setMuted] = useState(false)
  const [trimMinus30Db, setTrimMinus30Db] = useState(false)

  const clearRetry = useCallback(() => {
    if (retryTimer.current != null) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    setReconnecting(false)
  }, [])

  const attachTrack = useCallback(
    (track: RemoteTrack) => {
      if (!isAudioTrack(track)) return
      if (audioEls.current.has(track)) return
      const el = track.attach() // crée un <audio> et y branche le MediaStream
      el.autoplay = true
      el.controls = false
      // volume effectif (mute + trim -30 dB) — ref lue sans re-création du callback.
      el.volume = getEffectiveVolume(listenerVolumeRef.current, trimMinus30DbRef.current)
      audioHostRef.current?.appendChild(el)
      audioEls.current.set(track, el)
      // Bus d'analyse : tappe le MediaStreamTrack sans toucher à l'écoute.
      analyser?.addTrack(track.mediaStreamTrack)
      setPhase('listening')
      // Autoplay policy : si le navigateur bloque, on propose un geste.
      const p = el.play()
      if (p && typeof p.then === 'function') p.catch(() => setNeedGesture(true))
    },
    [audioHostRef, analyser],
  )

  const detachTrack = useCallback((track: RemoteAudioTrack) => {
    const el = audioEls.current.get(track)
    if (!el) return
    track.detach(el)
    el.remove()
    audioEls.current.delete(track)
    analyser?.removeTrack(track.mediaStreamTrack)
  }, [analyser])

  const detachAll = useCallback(() => {
    for (const [track, el] of audioEls.current) {
      try {
        track.detach(el)
      } catch {
        // track déjà détachée — on ignore
      }
      el.remove()
      analyser?.removeTrack(track.mediaStreamTrack)
    }
    audioEls.current.clear()
  }, [analyser])

  const teardown = useCallback(() => {
    detachAll()
    const room = roomRef.current
    roomRef.current = null
    if (room) {
      room.removeAllListeners()
      void room.disconnect().catch(() => {})
    }
  }, [detachAll])

  const connect = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    setPhase('connecting')
    setError(null)
    setLost(false)
    setNeedGesture(false)
    try {
      const res = await connectToRoom({ role: 'listener', identity, roomName })
      teardown() // au cas où une room précédente traîne
      const room = res.room
      roomRef.current = room
      attemptsRef.current = 0
      clearRetry()
      setPhase('connected')

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => attachTrack(track))
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (isAudioTrack(track)) detachTrack(track)
      })
      room.on(RoomEvent.Reconnecting, () => {
        setReconnecting(true)
        setLost(true)
      })
      room.on(RoomEvent.Reconnected, () => {
        attemptsRef.current = 0
        clearRetry()
        setLost(false)
        setReconnecting(false)
        setPhase((prev) => (prev === 'listening' ? 'listening' : 'connected'))
      })
      room.on(RoomEvent.Disconnected, () => {
        if (userStoppedRef.current) {
          setPhase('disconnected')
          return
        }
        detachAll()
        if (attemptsRef.current < MAX_ATTEMPTS) {
          const delay = 1000 * 2 ** attemptsRef.current // 1s, 2s, 4s
          attemptsRef.current += 1
          setLost(true)
          setReconnecting(true)
          retryTimer.current = window.setTimeout(() => {
            void connectRef.current()
          }, delay)
        } else {
          // max tentatives → on attend une action manuelle (bouton Reconnect)
          setReconnecting(false)
          setLost(true)
          setPhase('disconnected')
        }
      })

      // Pistes audio déjà publiées avant la connexion du listener.
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track) attachTrack(pub.track)
        }
      }
    } catch (e) {
      setPhase('error')
      setError(e instanceof Error ? e.message : String(e))
      teardown()
    } finally {
      startingRef.current = false
    }
  }, [identity, roomName, teardown, clearRetry, attachTrack, detachTrack, detachAll])

  // Tient le ref à jour pour le retry interne du handler Disconnected.
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const listenLive = useCallback(async () => {
    userStoppedRef.current = false
    attemptsRef.current = 0
    clearRetry()
    await connect()
  }, [clearRetry, connect])

  const reconnect = useCallback(async () => {
    userStoppedRef.current = false
    attemptsRef.current = 0
    clearRetry()
    await connect()
  }, [clearRetry, connect])

  const stopListening = useCallback(() => {
    userStoppedRef.current = true
    clearRetry()
    teardown()
    setPhase('disconnected')
    setLost(false)
    setReconnecting(false)
    setNeedGesture(false)
  }, [clearRetry, teardown])

  // Débloque l'autoplay : appelé depuis un clic utilisateur (US-3.1).
  const startAudio = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.startAudio()
      setNeedGesture(false)
      for (const el of audioEls.current.values()) {
        const p = el.play()
        if (p && typeof p.then === 'function') p.catch(() => {})
      }
    } catch {
      // garde needGesture true
    }
  }, [])

  // Volume listener local 0–100 (jamais > 100 : pas de boost). Appliqué à tous
  // les <audio> existants et mémorisé pour les futurs (attachTrack). Mute = 0,
  // avec mémoire du niveau précédent pour le démute.
  const setListenerVolume = useCallback((volumePercent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)))
    listenerVolumeRef.current = clamped
    setListenerVolumeState(clamped)
    // Volume effectif : intègre le trim -30 dB (mute = 0 ici car clamped=0).
    const eff = getEffectiveVolume(clamped, trimMinus30DbRef.current)
    for (const el of audioEls.current.values()) el.volume = eff
    if (clamped > 0 && muted) setMuted(false)
  }, [muted])

  const toggleMute = useCallback(() => {
    if (!muted) {
      preMuteRef.current = listenerVolumeRef.current
      setListenerVolume(0)
      setMuted(true)
    } else {
      setMuted(false)
      setListenerVolume(preMuteRef.current || 100)
    }
  }, [muted, setListenerVolume])

  // Trim PAD -30 dB (double-clic haut-parleur) : indépendant du mute. Bascule le
  // gain et réapplique le volume effectif à tous les <audio> existants. Les
  // futurs audio elements (reconnect/stop+listen) lisent trimMinus30DbRef dans
  // attachTrack → le trim reste appliqué pendant la session.
  const toggleTrimMinus30Db = useCallback(() => {
    const next = !trimMinus30DbRef.current
    trimMinus30DbRef.current = next
    setTrimMinus30Db(next)
    const eff = getEffectiveVolume(listenerVolumeRef.current, next)
    for (const el of audioEls.current.values()) el.volume = eff
  }, [])

  // Stats WebRTC du premier receiver audio attaché (livekit-client expose
  // getRTCStatsReport sur RemoteTrack). Fallback propre (undefined) si pas de
  // piste ou getStats indisponible — le hook appelant affiche « RX — ».
  const getAudioRxReport = useCallback(async (): Promise<RTCStatsReport | undefined> => {
    const track = audioEls.current.keys().next().value as RemoteAudioTrack | undefined
    if (!track) return undefined
    try {
      return await track.getRTCStatsReport()
    } catch {
      return undefined
    }
  }, [])

  // Nettoie le timer + la room au démontage (US-4.1) — pas de retry orphelin.
  useEffect(() => {
    return () => {
      if (retryTimer.current != null) clearTimeout(retryTimer.current)
      userStoppedRef.current = true
      const room = roomRef.current
      if (room) {
        room.removeAllListeners()
        void room.disconnect().catch(() => {})
      }
      for (const [, el] of audioEls.current) el.remove()
      audioEls.current.clear()
    }
  }, [])

  return {
    phase,
    error,
    identity,
    roomName,
    lost,
    reconnecting,
    needGesture,
    listenerVolume,
    muted,
    trimMinus30Db,
    listenLive,
    stopListening,
    reconnect,
    startAudio,
    setListenerVolume,
    toggleMute,
    toggleTrimMinus30Db,
    getAudioRxReport,
  }
}