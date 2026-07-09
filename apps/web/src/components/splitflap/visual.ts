import type {
  BroadcastVisual,
  BroadcastLayout,
  VisualPreset,
  VisualTransition,
  VisualNoteMode,
  VisualEngine,
  HotfxHeightMode,
  PanelDensity,
} from '../../api/broadcastMessage'

// Alphabet HotFX par défaut (espace initial significatif).
export const DEFAULT_HOTFX_CHARACTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-·.'

// Layout résolu (toutes valeurs bornées). Scales en %, rows en lignes.
export interface ResolvedLayout {
  titleScale: number
  secondaryScale: number
  noteScale: number
  tickerScale: number
  boardScale: number
  titleRows: number
  secondaryRows: number
}

export const DEFAULT_LAYOUT: ResolvedLayout = {
  titleScale: 100,
  secondaryScale: 100,
  noteScale: 100,
  tickerScale: 100,
  boardScale: 100,
  titleRows: 1,
  secondaryRows: 1,
}

export interface ResolvedVisual {
  preset: VisualPreset
  transition: VisualTransition
  noteMode: VisualNoteMode
  scrambleDurationMs: number
  staggerDelayMs: number
  pageDurationMs: number
  scrambleColors: string[]
  accentColors: string[]
  // Moteur + réglages HotFX.
  splitFlapEngine: VisualEngine
  hotfxHeightMode: HotfxHeightMode
  noteRowsMin: number
  noteRowsMax: number
  hotfxDurationMs: number
  hotfxCharacters: string
  hotfxGridGapPx: number
  // Style industriel.
  flicker: boolean
  flickerIntensity: number
  edgeGlow: boolean
  edgeGlowIntensity: number
  tileContrast: number
  panelNoise: boolean
  panelDensity: PanelDensity
  tileRadius: number
  tileBorderWidth: number
  layout: ResolvedLayout
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
  splitFlapEngine: 'internal',
  hotfxHeightMode: 'auto',
  noteRowsMin: 2,
  noteRowsMax: 5,
  hotfxDurationMs: 200,
  hotfxCharacters: DEFAULT_HOTFX_CHARACTERS,
  hotfxGridGapPx: 3,
  flicker: false,
  flickerIntensity: 35,
  edgeGlow: true,
  edgeGlowIntensity: 45,
  tileContrast: 40,
  panelNoise: false,
  panelDensity: 'normal',
  tileRadius: 3,
  tileBorderWidth: 1,
  layout: { ...DEFAULT_LAYOUT },
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

// ponytail: layout résolu côté client (borne pour l'UI). La vraie validation reste serveur.
function resolveLayout(l?: BroadcastLayout): ResolvedLayout {
  if (!l) return { ...DEFAULT_LAYOUT }
  return {
    titleScale: clamp(l.titleScale, DEFAULT_LAYOUT.titleScale, 50, 200),
    secondaryScale: clamp(l.secondaryScale, DEFAULT_LAYOUT.secondaryScale, 50, 200),
    noteScale: clamp(l.noteScale, DEFAULT_LAYOUT.noteScale, 50, 200),
    tickerScale: clamp(l.tickerScale, DEFAULT_LAYOUT.tickerScale, 50, 200),
    boardScale: clamp(l.boardScale, DEFAULT_LAYOUT.boardScale, 70, 130),
    titleRows: clamp(l.titleRows, DEFAULT_LAYOUT.titleRows, 1, 3),
    secondaryRows: clamp(l.secondaryRows, DEFAULT_LAYOUT.secondaryRows, 0, 2),
  }
}

/** Fusionne un visual partiel avec les défauts (client). La vraie validation
 *  reste côté serveur ; ici on borne juste pour ne pas casser l'UI. Garantit
 *  noteRowsMax >= noteRowsMin (cohérence si un seul des deux était fourni). */
export function resolveVisual(v?: BroadcastVisual): ResolvedVisual {
  if (!v) return { ...DEFAULT_VISUAL }
  const noteRowsMin = clamp(v.noteRowsMin, DEFAULT_VISUAL.noteRowsMin, 1, 8)
  const noteRowsMax = clamp(v.noteRowsMax, DEFAULT_VISUAL.noteRowsMax, 1, 12)
  return {
    preset: v.preset ?? DEFAULT_VISUAL.preset,
    transition: v.transition ?? DEFAULT_VISUAL.transition,
    noteMode: v.noteMode ?? DEFAULT_VISUAL.noteMode,
    scrambleDurationMs: clamp(v.scrambleDurationMs, DEFAULT_VISUAL.scrambleDurationMs, 100, 3000),
    staggerDelayMs: clamp(v.staggerDelayMs, DEFAULT_VISUAL.staggerDelayMs, 0, 200),
    pageDurationMs: clamp(v.pageDurationMs, DEFAULT_VISUAL.pageDurationMs, 2000, 30000),
    scrambleColors: v.scrambleColors ?? [],
    accentColors: v.accentColors ?? [],
    splitFlapEngine: v.splitFlapEngine ?? DEFAULT_VISUAL.splitFlapEngine,
    hotfxHeightMode: v.hotfxHeightMode ?? DEFAULT_VISUAL.hotfxHeightMode,
    noteRowsMin,
    noteRowsMax: Math.max(noteRowsMin, noteRowsMax),
    hotfxDurationMs: clamp(v.hotfxDurationMs, DEFAULT_VISUAL.hotfxDurationMs, 30, 1000),
    hotfxCharacters: v.hotfxCharacters && v.hotfxCharacters.length > 0 ? v.hotfxCharacters.slice(0, 120) : DEFAULT_VISUAL.hotfxCharacters,
    hotfxGridGapPx: clamp(v.hotfxGridGapPx, DEFAULT_VISUAL.hotfxGridGapPx, 0, 12),
    flicker: v.flicker ?? DEFAULT_VISUAL.flicker,
    flickerIntensity: clamp(v.flickerIntensity, DEFAULT_VISUAL.flickerIntensity, 0, 100),
    edgeGlow: v.edgeGlow ?? DEFAULT_VISUAL.edgeGlow,
    edgeGlowIntensity: clamp(v.edgeGlowIntensity, DEFAULT_VISUAL.edgeGlowIntensity, 0, 100),
    tileContrast: clamp(v.tileContrast, DEFAULT_VISUAL.tileContrast, 0, 100),
    panelNoise: v.panelNoise ?? DEFAULT_VISUAL.panelNoise,
    panelDensity: v.panelDensity ?? DEFAULT_VISUAL.panelDensity,
    tileRadius: clamp(v.tileRadius, DEFAULT_VISUAL.tileRadius, 0, 8),
    tileBorderWidth: clamp(v.tileBorderWidth, DEFAULT_VISUAL.tileBorderWidth, 1, 4),
    layout: resolveLayout(v.layout),
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

// ponytail: style → variables CSS posées sur le cabinet (consommées par le CSS
// internal .sf-tile et par ::part() HotFX). Les intensités 0–100 → unités CSS.
export function styleVars(v: ResolvedVisual): Record<string, string> {
  const flickerAmp = (v.flickerIntensity / 100) * 0.35
  const glowSpread = (v.edgeGlowIntensity / 100) * 22
  const contrastAmp = (v.tileContrast / 100) * 0.5
  const densityScale = v.panelDensity === 'compact' ? '0.85' : v.panelDensity === 'large' ? '1.18' : '1'
  return {
    '--sf-tile-radius': `${v.tileRadius}px`,
    '--sf-tile-border-width': `${v.tileBorderWidth}px`,
    '--sf-edge-glow': v.edgeGlow ? '1' : '0',
    '--sf-glow-spread': `${glowSpread}px`,
    '--sf-flicker': v.flicker ? '1' : '0',
    '--sf-flicker-amp': flickerAmp.toFixed(3),
    '--sf-contrast': (1 + contrastAmp).toFixed(3),
    '--sf-panel-noise': v.panelNoise ? '1' : '0',
    '--sf-density-scale': densityScale,
    // Tailles du panneau (layout) : scales % → multiplicateurs CSS. boardScale
    // pilote la taille de base (largeur tuile), les scales par zone s'ajoutent.
    '--sf-board-scale': (v.layout.boardScale / 100).toFixed(3),
    '--sf-title-scale': (v.layout.titleScale / 100).toFixed(3),
    '--sf-secondary-scale': (v.layout.secondaryScale / 100).toFixed(3),
    '--sf-note-scale': (v.layout.noteScale / 100).toFixed(3),
    '--sf-ticker-scale': (v.layout.tickerScale / 100).toFixed(3),
    // Var réelle du web component HotFX (lue par son #container grid).
    '--hotfx-split-flap-grid-gap': `${v.hotfxGridGapPx}px`,
  }
}