import { API_BASE } from './base'

export type BroadcastType = 'track' | 'show' | 'announcement' | 'note'
export type DisplayMode = 'static' | 'paged' | 'scroll'

export type VisualPreset = 'pirate-industrial' | 'airport-classic' | 'terminal-amber' | 'minimal-black'
export type VisualTransition = 'flip' | 'scramble' | 'flip-scramble' | 'instant'
export type VisualNoteMode = 'paged' | 'scroll' | 'static'
export type VisualEngine = 'internal' | 'hotfx'
export type HotfxHeightMode = 'auto' | 'fixed'
export type PanelDensity = 'compact' | 'normal' | 'large'

export interface BroadcastVisual {
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