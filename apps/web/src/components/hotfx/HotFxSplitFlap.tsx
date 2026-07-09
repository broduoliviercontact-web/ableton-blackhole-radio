import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import './hotfx-split-flap.js' // side-effect: enregistre <hotfx-split-flap> (une fois)
import type { HotFxSplitFlapElement } from './hotfx-split-flap'

// Alphabet étendu vs défaut HotFX : on garde le Latin + on ajoute · et -
// (séparateurs utilisés en secondary/note). Les accents ne sont PAS gérés
// par HotFX → remplacés par espace (limitation signalée).
// ponytail: guillemet droit échappé + apostrophe droite (match défaut HotFX).
const HOTFX_CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!.,:?\"'/$·-"

interface Props {
  text: string
  width: number
  height: number
  // ms par chute de clapet (attribut `duration` du composant). Ce n'est PAS la
  // durée totale d'installation — HotFX avance séquentiellement dans l'alphabet,
  // 1 char par clapet, jusqu'à la cible.
  durationMs: number
  className?: string
  style?: CSSProperties
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
export function HotFxSplitFlap({ text, width, height, durationMs, className, style }: Props) {
  const ref = useRef<HotFxSplitFlapElement>(null)

  // Réglages structurels : alphabet d'abord (lu par #updateTargetGrid au
  // prochain render/animate), puis width/height (le setter re-render + anime si
  // visible) et duration (pris au prochain flap).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.characters = HOTFX_CHARS
    el.width = width
    el.height = height
    el.duration = durationMs
  }, [width, height, durationMs])

  // Texte cible : posé impérativement → MutationObserver relance l'animation.
  useEffect(() => {
    const el = ref.current
    if (el) el.textContent = text
  }, [text])

  return <hotfx-split-flap ref={ref} className={className} style={style} />
}