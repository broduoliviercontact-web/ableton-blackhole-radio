import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './hotfx-split-flap.js' // side-effect: enregistre <hotfx-split-flap> (une fois)
import type { HotFxSplitFlapElement } from './hotfx-split-flap'
import { DEFAULT_HOTFX_CHARACTERS } from '../splitflap/visual'

interface Props {
  text: string
  width: number
  height: number
  // ms par chute de clapet (attribut `duration` du composant). Ce n'est PAS la
  // durée totale d'installation — HotFX avance séquentiellement dans l'alphabet,
  // 1 char par clapet, jusqu'à la cible.
  durationMs: number
  // Alphabet HotFX (espace initial significatif). Défaut = Latin + -·.
  characters?: string
  className?: string
  style?: CSSProperties
}

// ponytail: reduced-motion = on ne fige pas via CSS (HotFX utilise la Web
// Animations API) → on passe duration à 1ms : l'avance séquentielle devient
// quasi-instantanée (snap), sans mouvement prolongé. Le texte final reste intact.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Wrapper React du web component HotFX <hotfx-split-flap> (MIT, vendored).
 * HotFX découpe chaque lettre en demi-clapets (clip-path + backface-visibility)
 * → rendu plus mécanique que notre moteur internal. Uppercase forcé, avance
 * séquentielle dans l'alphabet (pas un scramble aléatoire).
 *
 * L'animation se déclenche au scroll-in-view (IntersectionObserver 50%) et au
 * changement du texte (MutationObserver). On pose le textContent impérativement
 * (et non via des enfants JSX) pour garantir le déclenchement du MutationObserver
 * à chaque changement de `text` — indépendant de la réconciliation children de
 * React sur les custom elements.
 */
export function HotFxSplitFlap({ text, width, height, durationMs, characters, className, style }: Props) {
  const ref = useRef<HotFxSplitFlapElement>(null)
  const reduced = usePrefersReducedMotion()
  const chars = characters && characters.length > 0 ? characters : DEFAULT_HOTFX_CHARACTERS
  const dur = reduced ? 1 : durationMs

  // Réglages structurels : alphabet d'abord (lu par #updateTargetGrid au
  // prochain render/animate), puis width/height (le setter re-render + anime si
  // visible) et duration (pris au prochain flap).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.characters = chars
    el.width = width
    el.height = height
    el.duration = dur
  }, [chars, width, height, dur])

  // Texte cible : posé impérativement → MutationObserver relance l'animation.
  useEffect(() => {
    const el = ref.current
    if (el) el.textContent = text
  }, [text])

  return <hotfx-split-flap ref={ref} className={className} style={style} />
}