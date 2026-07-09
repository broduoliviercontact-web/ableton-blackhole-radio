import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioPresets, Room, Track, type LocalTrackPublication } from 'livekit-client'
import { connectToRoom } from '../livekit/livekitClient'

export type BroadcastStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'publishing'
  | 'live'
  | 'error'

interface UseLiveKitBroadcastResult {
  status: BroadcastStatus
  error: string | null
  roomName: string
  identity: string
  publicationName: string | null
  postFaderStream: MediaStream | null
  start: (identity: string, masterVolume: number) => Promise<void>
  stop: () => Promise<void>
  setMasterVolume: (volumePercent: number) => void
}

const ACTIVE: ReadonlyArray<BroadcastStatus> = ['connecting', 'connected', 'publishing', 'live']

// Volume master 0–100 % → gain linéaire 0–1 (jamais > 1 : pas d'amplification).
const volumeToGain = (volumePercent: number): number => {
  const v = Math.max(0, Math.min(100, volumePercent))
  return v / 100
}

/**
 * Publie l'audio du MediaStream local dans une room LiveKit via un pipeline
 * Web Audio servant de fader master de volume (US-5) :
 *   MediaStream local → AudioContext → Source → GainNode → MediaStreamDestination
 *   → on publie la track issue du destination (jamais la track brute).
 * Le GainNode est un volume linéaire 0–1 (0 = mute, 1 = niveau source). Pas
 * d'amplification au-dessus de la source. Ne recrée PAS de capture micro.
 */
export function useLiveKitBroadcast(localStream: MediaStream | null): UseLiveKitBroadcastResult {
  const roomRef = useRef<Room | null>(null)
  const pubRef = useRef<LocalTrackPublication | null>(null)
  const startingRef = useRef(false)
  // Pipeline Web Audio (US-5.1).
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const destTrackRef = useRef<MediaStreamTrack | null>(null)

  const [status, setStatus] = useState<BroadcastStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [identity, setIdentity] = useState('')
  const [publicationName, setPublicationName] = useState<string | null>(null)
  // Flux post-fader (dest.stream) pour le VU-mètre de sortie (US-5).
  const [postFaderStream, setPostFaderStream] = useState<MediaStream | null>(null)

  // Libère room + publication.
  const cleanupRoom = useCallback(async () => {
    const room = roomRef.current
    const pub = pubRef.current
    try {
      if (room && pub?.track) {
        try {
          await room.localParticipant.unpublishTrack(pub.track, false)
        } catch {
          // déjà dépuliée
        }
      }
      if (room) {
        try {
          await room.disconnect()
        } catch {
          // déjà déconnectée
        }
      }
    } finally {
      roomRef.current = null
      pubRef.current = null
    }
  }, [])

  // Libère le pipeline Web Audio (US-5.1).
  const cleanupPipeline = useCallback(async () => {
    const ctx = ctxRef.current
    const source = sourceRef.current
    const gain = gainRef.current
    const track = destTrackRef.current
    try {
      source?.disconnect()
    } catch {
      // déjà déconnecté
    }
    try {
      gain?.disconnect()
    } catch {
      // déjà déconnecté
    }
    if (track) {
      try {
        track.stop()
      } catch {
        // déjà stoppée
      }
    }
    if (ctx) {
      try {
        await ctx.close()
      } catch {
        // déjà fermé
      }
    }
    ctxRef.current = null
    sourceRef.current = null
    gainRef.current = null
    destRef.current = null
    destTrackRef.current = null
    setPostFaderStream(null)
  }, [])

  const stop = useCallback(async () => {
    await cleanupRoom()
    await cleanupPipeline()
    setStatus('disconnected')
  }, [cleanupRoom, cleanupPipeline])

  const start = useCallback(
    async (identity: string, masterVolume: number) => {
      if (startingRef.current) return // anti double-clic (US-2.4)
      if (!localStream) {
        setError('Aucune capture locale active. Démarrez la capture d’abord.')
        setStatus('error')
        return
      }
      const inputTrack = localStream.getAudioTracks()[0]
      if (!inputTrack) {
        setError('Aucune piste audio dans le flux local.')
        setStatus('error')
        return
      }

      startingRef.current = true
      setError(null)
      setStatus('connecting')
      try {
        // Pipeline fader master (US-5) : on ne publie pas la track brute,
        // mais celle issue du MediaStreamDestination.
        const ctx = new AudioContext()
        await ctx.resume().catch(() => {})
        const source = ctx.createMediaStreamSource(localStream)
        const gain = ctx.createGain()
        gain.gain.value = volumeToGain(masterVolume)
        const dest = ctx.createMediaStreamDestination()
        source.connect(gain)
        gain.connect(dest)
        const processedTrack = dest.stream.getAudioTracks()[0]
        if (!processedTrack) throw new Error('Pipeline audio : aucune piste en sortie.')
        ctxRef.current = ctx
        sourceRef.current = source
        gainRef.current = gain
        destRef.current = dest
        destTrackRef.current = processedTrack
        setPostFaderStream(dest.stream) // VU-mètre post-fader (US-5)

        const res = await connectToRoom({ role: 'performer', identity, roomName: 'main' })
        roomRef.current = res.room
        setRoomName(res.roomName)
        setIdentity(res.identity)
        setStatus('connected')

        setStatus('publishing')
        const pub = await res.room.localParticipant.publishTrack(processedTrack, {
          name: 'mac-audio-input',
          source: Track.Source.Microphone,
          audioPreset: AudioPresets.musicHighQualityStereo,
          dtx: false,
          forceStereo: true,
        })
        pubRef.current = pub
        setPublicationName(pub.trackName)
        setStatus('live')
      } catch (e) {
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
        await cleanupRoom()
        await cleanupPipeline()
      } finally {
        startingRef.current = false
      }
    },
    [localStream, cleanupRoom, cleanupPipeline],
  )

  // Volume master réglable en direct : le graphe source→gain→dest est live,
  // donc pas de republication nécessaire (US-5).
  const setMasterVolume = useCallback((volumePercent: number) => {
    const gain = gainRef.current
    const ctx = ctxRef.current
    if (!gain || !ctx) return
    gain.gain.setTargetAtTime(volumeToGain(volumePercent), ctx.currentTime, 0.01)
  }, [])

  // Capture locale coupée pendant un broadcast → arrêter proprement (US-2.4).
  useEffect(() => {
    if (!localStream && ACTIVE.includes(status)) {
      void stop()
    }
  }, [localStream, status, stop])

  // Nettoyage au démontage (US-2.4) — ne pas laisser de room ni de ctx audio.
  useEffect(() => {
    return () => {
      void stop()
    }
  }, [stop])

  return {
    status,
    error,
    roomName,
    identity,
    publicationName,
    postFaderStream,
    start,
    stop,
    setMasterVolume,
  }
}