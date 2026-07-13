import { API_BASE } from './base'

export type BroadcastType = 'track' | 'show' | 'announcement' | 'note'
export type DisplayMode = 'static' | 'paged' | 'scroll'

export type VisualPreset = 'pirate-industrial' | 'airport-classic' | 'terminal-amber' | 'minimal-black'
export type VisualTransition = 'flip' | 'scramble' | 'flip-scramble' | 'instant'
export type VisualNoteMode = 'paged' | 'scroll' | 'static'
export type VisualEngine = 'internal' | 'hotfx'
export type Visualization = 'split-flap' | 'crt-terminal' | 'ascii-wave' | 'signal-scope'
export type HotfxHeightMode = 'auto' | 'fixed'
export type PanelDensity = 'compact' | 'normal' | 'large'
export type TickerDirection = 'left' | 'right'

// Alignement du texte dans la grille (header = CSS, titre/secondaire/note = padding).
export type TextAlign = 'left' | 'center' | 'right'

// Tailles du panneau (scales en %, rows en nb de lignes). Optionnel : vide → défauts.
export interface BroadcastLayout {
  titleScale?: number
  secondaryScale?: number
  noteScale?: number
  tickerScale?: number
  boardScale?: number
  titleRows?: number
  secondaryRows?: number
  boardColumns?: number
  brandAlign?: TextAlign
  titleAlign?: TextAlign
  secondaryAlign?: TextAlign
  noteAlign?: TextAlign
}

export interface BroadcastVisual {
  visualization?: Visualization
  preset?: VisualPreset
  transition?: VisualTransition
  noteMode?: VisualNoteMode
  scrambleDurationMs?: number
  staggerDelayMs?: number
  pageDurationMs?: number
  scrambleColors?: string[]
  accentColors?: string[]
  // Moteur split-flap persistant + réglages HotFX natifs.
  splitFlapEngine?: VisualEngine
  hotfxHeightMode?: HotfxHeightMode
  noteRowsMin?: number
  noteRowsMax?: number
  hotfxDurationMs?: number
  hotfxCharacters?: string
  hotfxGridGapPx?: number
  // Style industriel radio pirate.
  flicker?: boolean
  flickerIntensity?: number
  edgeGlow?: boolean
  edgeGlowIntensity?: number
  tileContrast?: number
  panelNoise?: boolean
  panelDensity?: PanelDensity
  tileRadius?: number
  tileBorderWidth?: number
  // Tailles du panneau.
  layout?: BroadcastLayout
  // Bandeau roulant (ticker) : vitesse, sens, séparateur, activation.
  tickerSpeedMs?: number
  tickerDirection?: TickerDirection
  tickerSeparator?: string
  tickerEnabled?: boolean
  // Mode note « scroll » : défilement dans les tuiles split-flap.
  noteScrollSpeedMs?: number
  noteScrollStep?: number
  noteScrollLoop?: boolean
}

export interface BroadcastMessage {
  type: BroadcastType
  mainTitle: string
  subtitle?: string
  artist?: string
  album?: string
  note?: string
  ticker?: string
  url?: string
  displayMode?: DisplayMode
  visual?: BroadcastVisual
  // Nom de la radio / label du panneau (header public). ≠ mainTitle.
  brandLabel?: string
  updatedAt: string
}

// Saisie performer (updatedAt géré côté serveur).
export interface BroadcastInput {
  type: BroadcastType
  mainTitle: string
  subtitle?: string
  artist?: string
  album?: string
  note?: string
  ticker?: string
  url?: string
  displayMode?: DisplayMode
  visual?: BroadcastVisual
  brandLabel?: string
}

export async function fetchBroadcastMessage(): Promise<BroadcastMessage | null> {
  const res = await fetch(`${API_BASE}/api/broadcast-message`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = (await res.json()) as { message: BroadcastMessage | null }
  return body.message
}

export async function postBroadcastMessage(
  performerPassword: string,
  message: BroadcastInput,
): Promise<BroadcastMessage> {
  const res = await fetch(`${API_BASE}/api/broadcast-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performerPassword, message }),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      // body non-JSON
    }
    throw new Error(detail)
  }
  const body = (await res.json()) as { ok: true; message: BroadcastMessage }
  return body.message
}

export async function clearBroadcastMessage(performerPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/broadcast-message`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performerPassword }),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      // body non-JSON
    }
    throw new Error(detail)
  }
}
