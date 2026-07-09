import { z } from 'zod'

export type MessageType = 'track' | 'show' | 'announcement' | 'note'
export type DisplayMode = 'static' | 'paged' | 'scroll'

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
  updatedAt: string // généré côté serveur, jamais confiance au client
}

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