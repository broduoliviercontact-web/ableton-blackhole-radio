import { z } from 'zod'

export type MessageType = 'track' | 'show' | 'announcement' | 'note'
export type DisplayMode = 'static' | 'paged' | 'scroll'

export type VisualPreset = 'pirate-industrial' | 'airport-classic' | 'terminal-amber' | 'minimal-black'
export type VisualTransition = 'flip' | 'scramble' | 'flip-scramble' | 'instant'
export type VisualNoteMode = 'paged' | 'scroll' | 'static'
export type VisualEngine = 'internal' | 'hotfx'
export type HotfxHeightMode = 'auto' | 'fixed'
export type PanelDensity = 'compact' | 'normal' | 'large'
export type TickerDirection = 'left' | 'right'

// Alignement du texte (header = CSS, titre/secondaire/note = padding grille).
export type TextAlign = 'left' | 'center' | 'right'

// Tailles du panneau (scales en %, rows en nb de lignes).
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
  type: MessageType
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
  updatedAt: string // généré côté serveur, jamais confiance au client
}

const HEX = /^#[0-9a-fA-F]{6}$/

// Nettoie un tableau de couleurs : ne garde que les hex valides, max 8.
// ponytail: on filtre au lieu de rejeter — « nettoyer les valeurs côté serveur ».
function cleanColors(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined
  const ok = arr.filter((c) => typeof c === 'string' && HEX.test(c.trim())).map((c) => (c as string).trim())
  return ok.length > 0 ? ok.slice(0, 8) : undefined
}

const clampInt = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(n)))

// Schéma visual : clamp les nombres, filtre les couleurs. Tous champs optionnels.
const visualSchema = z
  .object({
    preset: z.enum(['pirate-industrial', 'airport-classic', 'terminal-amber', 'minimal-black']).optional(),
    transition: z.enum(['flip', 'scramble', 'flip-scramble', 'instant']).optional(),
    noteMode: z.enum(['paged', 'scroll', 'static']).optional(),
    scrambleDurationMs: z.coerce.number().optional(),
    staggerDelayMs: z.coerce.number().optional(),
    pageDurationMs: z.coerce.number().optional(),
    scrambleColors: z.array(z.string()).optional(),
    accentColors: z.array(z.string()).optional(),
    splitFlapEngine: z.enum(['internal', 'hotfx']).optional(),
    hotfxHeightMode: z.enum(['auto', 'fixed']).optional(),
    noteRowsMin: z.coerce.number().optional(),
    noteRowsMax: z.coerce.number().optional(),
    hotfxDurationMs: z.coerce.number().optional(),
    hotfxCharacters: z.string().optional(),
    hotfxGridGapPx: z.coerce.number().optional(),
    flicker: z.boolean().optional(),
    flickerIntensity: z.coerce.number().optional(),
    edgeGlow: z.boolean().optional(),
    edgeGlowIntensity: z.coerce.number().optional(),
    tileContrast: z.coerce.number().optional(),
    panelNoise: z.boolean().optional(),
    panelDensity: z.enum(['compact', 'normal', 'large']).optional(),
    tileRadius: z.coerce.number().optional(),
    tileBorderWidth: z.coerce.number().optional(),
    tickerSpeedMs: z.coerce.number().optional(),
    tickerDirection: z.enum(['left', 'right']).optional(),
    tickerSeparator: z.string().optional(),
    tickerEnabled: z.boolean().optional(),
    noteScrollSpeedMs: z.coerce.number().optional(),
    noteScrollStep: z.coerce.number().optional(),
    noteScrollLoop: z.boolean().optional(),
    layout: z
      .object({
        titleScale: z.coerce.number().optional(),
        secondaryScale: z.coerce.number().optional(),
        noteScale: z.coerce.number().optional(),
        tickerScale: z.coerce.number().optional(),
        boardScale: z.coerce.number().optional(),
        titleRows: z.coerce.number().optional(),
        secondaryRows: z.coerce.number().optional(),
        boardColumns: z.coerce.number().optional(),
        brandAlign: z.enum(['left', 'center', 'right']).optional(),
        titleAlign: z.enum(['left', 'center', 'right']).optional(),
        secondaryAlign: z.enum(['left', 'center', 'right']).optional(),
        noteAlign: z.enum(['left', 'center', 'right']).optional(),
      })
      .strict()
      .optional()
      .transform((l) => {
        if (!l) return undefined
        const out: BroadcastLayout = {}
        if (l.titleScale != null) out.titleScale = clampInt(l.titleScale, 50, 200)
        if (l.secondaryScale != null) out.secondaryScale = clampInt(l.secondaryScale, 50, 200)
        if (l.noteScale != null) out.noteScale = clampInt(l.noteScale, 50, 200)
        if (l.tickerScale != null) out.tickerScale = clampInt(l.tickerScale, 50, 200)
        if (l.boardScale != null) out.boardScale = clampInt(l.boardScale, 70, 130)
        if (l.titleRows != null) out.titleRows = clampInt(l.titleRows, 1, 3)
        if (l.secondaryRows != null) out.secondaryRows = clampInt(l.secondaryRows, 0, 2)
        if (l.boardColumns != null) out.boardColumns = clampInt(l.boardColumns, 12, 64)
        if (l.brandAlign) out.brandAlign = l.brandAlign
        if (l.titleAlign) out.titleAlign = l.titleAlign
        if (l.secondaryAlign) out.secondaryAlign = l.secondaryAlign
        if (l.noteAlign) out.noteAlign = l.noteAlign
        return Object.keys(out).length > 0 ? out : undefined
      }),
  })
  .strict()
  .optional()
  .transform((v) => {
    if (!v) return undefined
    const out: BroadcastVisual = {}
    if (v.preset) out.preset = v.preset
    if (v.transition) out.transition = v.transition
    if (v.noteMode) out.noteMode = v.noteMode
    if (v.scrambleDurationMs != null) out.scrambleDurationMs = clampInt(v.scrambleDurationMs, 100, 3000)
    if (v.staggerDelayMs != null) out.staggerDelayMs = clampInt(v.staggerDelayMs, 0, 200)
    if (v.pageDurationMs != null) out.pageDurationMs = clampInt(v.pageDurationMs, 2000, 30000)
    const sc = cleanColors(v.scrambleColors)
    if (sc) out.scrambleColors = sc
    const ac = cleanColors(v.accentColors)
    if (ac) out.accentColors = ac
    if (v.splitFlapEngine) out.splitFlapEngine = v.splitFlapEngine
    if (v.hotfxHeightMode) out.hotfxHeightMode = v.hotfxHeightMode
    if (v.noteRowsMin != null) out.noteRowsMin = clampInt(v.noteRowsMin, 1, 8)
    if (v.noteRowsMax != null) out.noteRowsMax = clampInt(v.noteRowsMax, 1, 12)
    if (v.hotfxDurationMs != null) out.hotfxDurationMs = clampInt(v.hotfxDurationMs, 30, 1000)
    // Alphabet HotFX : pas de trim (l'espace initial est significatif), max 120.
    if (typeof v.hotfxCharacters === 'string' && v.hotfxCharacters.length > 0)
      out.hotfxCharacters = v.hotfxCharacters.slice(0, 120)
    if (v.hotfxGridGapPx != null) out.hotfxGridGapPx = clampInt(v.hotfxGridGapPx, 0, 12)
    if (v.flicker != null) out.flicker = v.flicker
    if (v.flickerIntensity != null) out.flickerIntensity = clampInt(v.flickerIntensity, 0, 100)
    if (v.edgeGlow != null) out.edgeGlow = v.edgeGlow
    if (v.edgeGlowIntensity != null) out.edgeGlowIntensity = clampInt(v.edgeGlowIntensity, 0, 100)
    if (v.tileContrast != null) out.tileContrast = clampInt(v.tileContrast, 0, 100)
    if (v.panelNoise != null) out.panelNoise = v.panelNoise
    if (v.panelDensity) out.panelDensity = v.panelDensity
    if (v.tileRadius != null) out.tileRadius = clampInt(v.tileRadius, 0, 8)
    if (v.tileBorderWidth != null) out.tileBorderWidth = clampInt(v.tileBorderWidth, 1, 4)
    if (v.tickerSpeedMs != null) out.tickerSpeedMs = clampInt(v.tickerSpeedMs, 5000, 120000)
    if (v.tickerDirection) out.tickerDirection = v.tickerDirection
    // Séparateur : pas de trim (espaces significatifs), max 12. Fallback ' · ' côté client.
    if (typeof v.tickerSeparator === 'string' && v.tickerSeparator.length > 0)
      out.tickerSeparator = v.tickerSeparator.slice(0, 12)
    if (v.tickerEnabled != null) out.tickerEnabled = v.tickerEnabled
    if (v.noteScrollSpeedMs != null) out.noteScrollSpeedMs = clampInt(v.noteScrollSpeedMs, 100, 5000)
    if (v.noteScrollStep != null) out.noteScrollStep = clampInt(v.noteScrollStep, 1, 8)
    if (v.noteScrollLoop != null) out.noteScrollLoop = v.noteScrollLoop
    if (v.layout) out.layout = v.layout
    // Fallback propre (pas de rejet) : noteRowsMax >= noteRowsMin.
    if (out.noteRowsMin != null && out.noteRowsMax != null && out.noteRowsMax < out.noteRowsMin) {
      out.noteRowsMax = out.noteRowsMin
    }
    // Objet vide → undefined (pas de visual stocké).
    return Object.keys(out).length > 0 ? out : undefined
  })

// Schéma de validation d'un message entrant. Tailles limitées, champs trimés.
const messageSchema = z
  .object({
    type: z.enum(['track', 'show', 'announcement', 'note']),
    mainTitle: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(160).optional(),
    artist: z.string().trim().max(120).optional(),
    album: z.string().trim().max(120).optional(),
    note: z.string().trim().max(2000).optional(),
    ticker: z.string().trim().max(500).optional(),
    url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https?:\/\//i.test(v), 'URL invalide (http/https requis)')
      .optional(),
    displayMode: z.enum(['static', 'paged', 'scroll']).optional(),
    visual: visualSchema,
    brandLabel: z.string().trim().max(60).optional(),
  })
  .strict()

// Valide et normalise un message entrant. updatedAt est forcé côté serveur.
// Les champs optionnels vides deviennent undefined (pas de chaîne vide).
export function parseBroadcastMessage(input: unknown): BroadcastMessage {
  const data = messageSchema.parse(input)
  const clean = (v: string | undefined): string | undefined => (v && v.length > 0 ? v : undefined)
  return {
    type: data.type,
    mainTitle: data.mainTitle,
    subtitle: clean(data.subtitle),
    artist: clean(data.artist),
    album: clean(data.album),
    note: clean(data.note),
    ticker: clean(data.ticker),
    url: clean(data.url),
    displayMode: data.displayMode,
    visual: data.visual,
    brandLabel: clean(data.brandLabel),
    updatedAt: new Date().toISOString(),
  }
}

// Store mémoire MVP : le message est perdu au redémarrage du serveur (Render).
// Plus tard : Supabase / Redis / LiveKit room metadata.
let current: BroadcastMessage | null = null

export function getBroadcastMessage(): BroadcastMessage | null {
  return current
}

export function setBroadcastMessage(message: BroadcastMessage | null): void {
  current = message
}