import { z } from 'zod'

export type MessageType = 'track' | 'show' | 'announcement' | 'note'
export type DisplayMode = 'static' | 'paged' | 'scroll'

export type VisualPreset = 'pirate-industrial' | 'airport-classic' | 'terminal-amber' | 'minimal-black'
export type VisualTransition = 'flip' | 'scramble' | 'flip-scramble' | 'instant'
export type VisualNoteMode = 'paged' | 'scroll' | 'static'

export interface BroadcastVisual {
  preset?: VisualPreset
  transition?: VisualTransition
  noteMode?: VisualNoteMode
  scrambleDurationMs?: number
  staggerDelayMs?: number
  pageDurationMs?: number
  scrambleColors?: string[]
  accentColors?: string[]
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