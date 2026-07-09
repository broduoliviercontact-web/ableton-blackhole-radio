import { useEffect, useRef } from 'react'

/**
 * Boucle requestAnimationFrame throttlée à maxFps, désactivée quand `enabled`
 * est false (panneau masqué / onglet caché / pas d'audio). La callback est lue
 * via ref → stable, pas de re-création du rAF à chaque rendu.
 * ponytail: un seul hook partagé par les 6 visualisations (DRY).
 */
export function useRafLoop(enabled: boolean, maxFps: number, fn: () => void): void {
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let last = 0
    const minDt = maxFps > 0 ? 1000 / maxFps : 0
    const tick = (t: number): void => {
      raf = requestAnimationFrame(tick)
      if (minDt > 0 && t - last < minDt) return
      last = t
      fnRef.current()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, maxFps])
}