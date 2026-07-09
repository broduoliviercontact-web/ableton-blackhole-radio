import type { BroadcastVisual, VisualPreset, VisualTransition, VisualNoteMode } from '../../api/broadcastMessage'

export interface ResolvedVisual {
  preset: VisualPreset
  transition: VisualTransition
  noteMode: VisualNoteMode
  scrambleDurationMs: number
  staggerDelayMs: number
  pageDurationMs: number
  scrambleColors: string[]
  accentColors: string[]
}

// Valeurs par défaut = preset « pirate-industrial » actuel.
export const DEFAULT_VISUAL: ResolvedVisual = {
  preset: 'pirate-industrial',
  transition: 'flip',
  noteMode: 'paged',
  scrambleDurationMs: 600,
  staggerDelayMs: 12,
  pageDurationMs: 6000,
  scrambleColors: [],
  accentColors: [],
}

// Couleur d'accent par preset (utilisée si accentColors vide).
const PRESET_ACCENT: Record<VisualPreset, string> = {
  'pirate-industrial': '#f5d76b',
  'airport-classic': '#ffb000',
  'terminal-amber': '#ffb000',
  'minimal-black': '#e8e8e8',
}

const clamp = (n: number | undefined, fallback: number, min: number, max: number): number =>
  n == null || Number.isNaN(n) ? fallback : Math.max(min, Math.min(max, Math.round(n)))

/** Fusionne un visual partiel avec les défauts (client). La vraie validation
 *  reste côté serveur ; ici on borne juste pour ne pas casser l'UI. */
export function resolveVisual(v?: BroadcastVisual): ResolvedVisual {
  if (!v) return { ...DEFAULT_VISUAL }
  return {
    preset: v.preset ?? DEFAULT_VISUAL.preset,
    transition: v.transition ?? DEFAULT_VISUAL.transition,
    noteMode: v.noteMode ?? DEFAULT_VISUAL.noteMode,
    scrambleDurationMs: clamp(v.scrambleDurationMs, DEFAULT_VISUAL.scrambleDurationMs, 100, 3000),
    staggerDelayMs: clamp(v.staggerDelayMs, DEFAULT_VISUAL.staggerDelayMs, 0, 200),
    pageDurationMs: clamp(v.pageDurationMs, DEFAULT_VISUAL.pageDurationMs, 2000, 30000),
    scrambleColors: v.scrambleColors ?? [],
    accentColors: v.accentColors ?? [],
  }
}

export function presetClass(preset: VisualPreset): string {
  return `sf-cabinet--${preset}`
}

export function accentColor(v: ResolvedVisual): string {
  return v.accentColors[0] ?? PRESET_ACCENT[v.preset]
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Parse une liste de couleurs séparées par virgule → hex valides (max 8).
 *  Validation client minimale ; la vraie reste côté serveur. */
export function parseColors(text: string): string[] {
  return text
    .split(',')
    .map((c) => c.trim())
    .filter((c) => HEX.test(c))
    .slice(0, 8)
}