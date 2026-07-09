import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Cale la résolution interne du canvas (attributs width/height) sur sa taille
 * affichée (CSS). Sans ça, le canvas reste à 300×150 et est étiré → flou.
 * ponytail: 1:1 pixels CSS (pas de DPR) pour garder la logique de dessin simple.
 * ResizeObserver → recalcule au resize (le canvas se clear, le rAF redessine).
 */
export function useCanvasResolution(ref: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const apply = (): void => {
      const r = c.getBoundingClientRect()
      c.width = Math.max(1, Math.round(r.width))
      c.height = Math.max(1, Math.round(r.height))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(c)
    return () => ro.disconnect()
  }, [ref])
}