import { createContext, useContext } from 'react'
import type { VisualTransition } from '../../api/broadcastMessage'

// Réglages visuels appliqués à toutes les tuiles d'un panneau. Fournis par
// SplitFlapVisualProvider (RadioPage / SplitFlapPreview), consommés par les
// tuiles et lignes — évite de percoler 4 props à travers Display/Line.
export interface SplitFlapVisualSettings {
  transition: VisualTransition
  scrambleDurationMs: number
  staggerDelayMs: number
  scrambleColors: string[]
}

export const DEFAULT_VISUAL_SETTINGS: SplitFlapVisualSettings = {
  transition: 'flip',
  scrambleDurationMs: 600,
  staggerDelayMs: 12,
  scrambleColors: [],
}

const SplitFlapVisualContext = createContext<SplitFlapVisualSettings>(DEFAULT_VISUAL_SETTINGS)

export const SplitFlapVisualProvider = SplitFlapVisualContext.Provider

export function useSplitFlapVisual(): SplitFlapVisualSettings {
  return useContext(SplitFlapVisualContext)
}