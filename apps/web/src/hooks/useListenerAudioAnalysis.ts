import { useEffect, useRef } from 'react'
import { ListenerAudioAnalyser } from '../audio/listenerAnalysis'

/**
 * Possède l'instance ListenerAudioAnalyser (stable) et la ferme au démontage.
 * L'AudioContext n'est créé qu'au premier addTrack (depuis useLiveKitListen),
 * donc après le geste « Listen live ». Aucune analyse n'a lieu tant que le
 * listener n'a pas cliqué.
 */
export function useListenerAudioAnalysis(): ListenerAudioAnalyser {
  const ref = useRef<ListenerAudioAnalyser | null>(null)
  if (!ref.current) ref.current = new ListenerAudioAnalyser()
  useEffect(() => {
    const a = ref.current
    return () => {
      a?.stop()
    }
  }, [])
  return ref.current
}