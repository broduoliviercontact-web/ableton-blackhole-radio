import { useCallback, useMemo, useState } from 'react'

export interface ListenerPlaybackControls {
  listenerVolume: number
  muted: boolean
  trimMinus30Db: boolean
  setListenerVolume: (volumePercent: number) => void
  setMuted: (muted: boolean) => void
  setTrimMinus30Db: (trimMinus30Db: boolean) => void
  toggleMute: () => void
  toggleTrimMinus30Db: () => void
}

function clampVolume(volumePercent: number): number {
  return Math.max(0, Math.min(100, Math.round(volumePercent)))
}

export function useListenerPlaybackControls(): ListenerPlaybackControls {
  const [listenerVolume, setListenerVolumeState] = useState(100)
  const [muted, setMuted] = useState(false)
  const [trimMinus30Db, setTrimMinus30Db] = useState(false)
  const [preMuteVolume, setPreMuteVolume] = useState(100)

  const setListenerVolume = useCallback((volumePercent: number) => {
    const next = clampVolume(volumePercent)
    setListenerVolumeState(next)
    if (next > 0) setMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((wasMuted) => {
      if (!wasMuted) {
        setPreMuteVolume(listenerVolume)
        setListenerVolumeState(0)
        return true
      }
      setListenerVolumeState(preMuteVolume || 100)
      return false
    })
  }, [listenerVolume, preMuteVolume])

  const toggleTrimMinus30Db = useCallback(() => {
    setTrimMinus30Db((value) => !value)
  }, [])

  return useMemo(
    () => ({
      listenerVolume,
      muted,
      trimMinus30Db,
      setListenerVolume,
      setMuted,
      setTrimMinus30Db,
      toggleMute,
      toggleTrimMinus30Db,
    }),
    [listenerVolume, muted, trimMinus30Db, setListenerVolume, toggleMute, toggleTrimMinus30Db],
  )
}
