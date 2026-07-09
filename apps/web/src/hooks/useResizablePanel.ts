import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

// Redimensionnement vertical d'un panneau : drag souris / trackpad / touch via
// pointer capture sur la poignée (pas d'écouteurs window à nettoyer — le capture
// route les pointermove/up vers l'élément même hors de sa zone). Clamp 220–760,
// persistance localStorage locale (radio.audioMonitor.height). Aucune synchro
// backend. ponytail: readStored garde un défaut sûr si localStorage absent/quota.

const KEY = 'radio.audioMonitor.height'
export const PANEL_MIN_HEIGHT = 220
export const PANEL_MAX_HEIGHT = 760
export const PANEL_DEFAULT_HEIGHT = 360

export function clampHeight(n: number): number {
  // NaN (localStorage corrompu / calcul absent) → défaut sûr. Infinity (cas
  // défensif impossible en pratique) tombe sur le clamp → max. ponytail: on ne
  // rejette pas, on borne.
  if (Number.isNaN(n)) return PANEL_DEFAULT_HEIGHT
  return Math.max(PANEL_MIN_HEIGHT, Math.min(PANEL_MAX_HEIGHT, Math.round(n)))
}

function readStored(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw == null) return PANEL_DEFAULT_HEIGHT
    return clampHeight(Number(raw))
  } catch {
    return PANEL_DEFAULT_HEIGHT
  }
}

export function useResizablePanel(): {
  height: number
  panelRef: React.RefObject<HTMLElement | null>
  startResize: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  endResize: (e: ReactPointerEvent) => void
  onKey: (e: ReactKeyboardEvent) => void
  setPresetHeight: (h: number) => void
} {
  const [height, setHeightState] = useState<number>(readStored)
  const panelRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  const setHeight = useCallback((h: number): void => {
    const c = clampHeight(h)
    setHeightState(c)
    try {
      localStorage.setItem(KEY, String(c))
    } catch {
      /* mode privé / quota : on garde la valeur en mémoire seulement */
    }
  }, [])

  const setPresetHeight = useCallback((h: number): void => setHeight(h), [setHeight])

  const startResize = useCallback((e: ReactPointerEvent): void => {
    e.preventDefault()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* certains navigateurs / contexts */
    }
    const rect = panelRef.current?.getBoundingClientRect()
    dragRef.current = { startY: e.clientY, startH: rect ? rect.height : height }
    document.body.style.userSelect = 'none'
  }, [height])

  const onPointerMove = useCallback((e: ReactPointerEvent): void => {
    const d = dragRef.current
    if (!d) return
    setHeight(d.startH + (e.clientY - d.startY))
  }, [setHeight])

  const endResize = useCallback((e: ReactPointerEvent): void => {
    if (!dragRef.current) return
    dragRef.current = null
    document.body.style.userSelect = ''
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const onKey = useCallback((e: ReactKeyboardEvent): void => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHeight(height + 20)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHeight(height - 20)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setHeight(PANEL_MIN_HEIGHT)
    } else if (e.key === 'End') {
      e.preventDefault()
      setHeight(PANEL_MAX_HEIGHT)
    }
  }, [height, setHeight])

  return { height, panelRef, startResize, onPointerMove, endResize, onKey, setPresetHeight }
}