import { useCallback, useEffect, useState } from 'react'
import { getAudioInputDevices, pickPreferredAudioInput, type AudioInputDevice } from '../audio/mediaDevices'

interface UseAudioDevicesResult {
  devices: AudioInputDevice[]
  selectedId: string
  setSelectedId: (id: string) => void
  refresh: () => Promise<void>
}

/**
 * Liste les entrées audio une fois la permission accordée (`enabled`).
 * Présélectionne l'entrée préférée (BlackHole > Loopback > première), sans
 * imposer BlackHole — l'utilisateur peut choisir n'importe quelle entrée.
 */
export function useAudioDevices(enabled: boolean): UseAudioDevicesResult {
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [selectedId, setSelectedId] = useState('')

  const refresh = useCallback(async () => {
    const list = await getAudioInputDevices()
    setDevices(list)
    setSelectedId((prev) => {
      if (prev && list.some((d) => d.deviceId === prev)) return prev
      const preferred = pickPreferredAudioInput(list)
      return preferred ? preferred.deviceId : ''
    })
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refresh()
    const onChange = (): void => void refresh()
    navigator.mediaDevices.addEventListener('devicechange', onChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange)
  }, [enabled, refresh])

  return { devices, selectedId, setSelectedId, refresh }
}