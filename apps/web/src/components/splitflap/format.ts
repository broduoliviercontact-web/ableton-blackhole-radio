// Entrée minimale pour le formattage du panneau : accepte BroadcastMessage,
// BroadcastInput, ou null (seuls les champs texte sont lus).
export interface SplitFlapInput {
  mainTitle?: string
  subtitle?: string
  artist?: string
  album?: string
  note?: string
  ticker?: string
}

// Dimensions du panneau : grille UNIFORME 32 colonnes (toutes les zones ont la
// même largeur → colonnes alignées = vrai panneau continu). Ponytail: fixes,
// la CSS adapte juste la taille des tuiles.
export const SPLIT_FLAP_TITLE_COLS = 32
export const SPLIT_FLAP_SECONDARY_COLS = 32
export const SPLIT_FLAP_NOTE_COLS = 32
export const SPLIT_FLAP_NOTE_ROWS = 4
export const SPLIT_FLAP_PAGE_DURATION_MS = 6000

const FALLBACK_TITLE = 'RADIO BLACKHOLE'
const FALLBACK_NOTE = 'EN ATTENTE DU MESSAGE PERFORMER.'
const FALLBACK_TICKER = 'RADIO BLACKHOLE · PIRATE WEBRTC STREAM · LISTEN LIVE'

export interface SplitFlapBoard {
  title: string
  secondary: string
  notePages: string[][]
  ticker: string
  // Versions brutes (uppercase, fallback) pour le layout dynamique (wrap rows).
  titleRaw: string
  secondaryRaw: string
  noteRaw: string
}

// Centre un texte dans `cols` (espaces de chaque côté). Tronque si trop long.
export function centerLine(text: string, cols: number): string {
  const clean = text.length > cols ? text.slice(0, cols) : text
  if (clean.length >= cols) return clean
  const pad = cols - clean.length
  const left = Math.floor(pad / 2)
  return `${' '.repeat(left)}${clean}${' '.repeat(pad - left)}`
}

function padRight(line: string, cols: number): string {
  const clean = line.length > cols ? line.slice(0, cols) : line
  return clean.padEnd(cols, ' ')
}

// Wrap mot par mot sur `cols` caractères. ponytail: wrap simple, pas de césure fine.
export function wrapWords(text: string, cols: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w
    if (candidate.length > cols) {
      if (cur) lines.push(cur)
      if (w.length > cols) {
        for (let i = 0; i < w.length; i += cols) lines.push(w.slice(i, i + cols))
        cur = ''
      } else {
        cur = w
      }
    } else {
      cur = candidate
    }
  }
  if (cur) lines.push(cur)
  return lines.length > 0 ? lines : ['']
}

// Wrap + centre sur `cols`, max `maxRows` lignes, chacune paddée à `cols`.
// ponytail: wrap mot simple, tronque au-delà de maxRows. Sert au titre (1–3
// lignes) et au secondaire (0–2 lignes) — grille continue (largeur uniforme).
export function wrapCentered(raw: string, cols: number, maxRows: number): string[] {
  return wrapWords(raw, cols)
    .slice(0, Math.max(1, maxRows))
    .map((l) => centerLine(l, cols))
}

// Découpe un texte en pages de NOTE_ROWS lignes chacune (toutes les pages —
// le mode static/paged est décidé par le consommateur, pas ici).
function toPages(text: string, cols: number, rows: number): string[][] {
  const lines = wrapWords(text.toUpperCase(), cols)
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += rows) {
    const page = lines.slice(i, i + rows).map((l) => padRight(l, cols))
    while (page.length < rows) page.push(padRight('', cols))
    pages.push(page)
  }
  return pages.length > 0 ? pages : [Array.from({ length: rows }, () => padRight('', cols))]
}

// Pages NON paddées (dernière page courte possible) — pour la hauteur
// dynamique HotFX. Chaque ligne tronquée à `cols`, pas de lignes vides ajoutées.
export function notePagesRaw(text: string, cols: number, rows: number): string[][] {
  const lines = wrapWords(text.toUpperCase(), cols).map((l) => l.slice(0, cols))
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows))
  return pages.length > 0 ? pages : [['']]
}

/**
 * Transforme un message en contenu du panneau split-flap : titre centré,
 * secondaire centré (ou ligne vide si pas de métadonnées), note paginée,
 * ticker. Fallbacks si champs vides. Uppercase (look affichage gare).
 */
export function formatBroadcastMessage(message: SplitFlapInput | null): SplitFlapBoard {
  const m = message
  const titleRaw = (m?.mainTitle?.trim() || FALLBACK_TITLE).toUpperCase()
  const secondaryParts = [m?.subtitle, m?.artist, m?.album]
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0)
  // Pas de métadonnées → ligne vide (tuiles vides, pas de texte inutile).
  const secondaryRaw = secondaryParts.length > 0 ? secondaryParts.join(' · ').toUpperCase() : ''
  const noteRaw = (m?.note?.trim() || FALLBACK_NOTE).toUpperCase()
  const tickerRaw = (m?.ticker?.trim() || FALLBACK_TICKER).toUpperCase()

  return {
    title: centerLine(titleRaw, SPLIT_FLAP_TITLE_COLS),
    secondary: secondaryRaw ? centerLine(secondaryRaw, SPLIT_FLAP_SECONDARY_COLS) : padRight('', SPLIT_FLAP_SECONDARY_COLS),
    notePages: toPages(noteRaw, SPLIT_FLAP_NOTE_COLS, SPLIT_FLAP_NOTE_ROWS),
    ticker: tickerRaw,
    titleRaw,
    secondaryRaw,
    noteRaw,
  }
}