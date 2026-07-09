import type { BroadcastMessage } from '../../api/broadcastMessage'

// Dimensions du panneau (colonnes/lignes). Ponytail: fixes, pas de responsive
// dynamique — la CSS adapte juste la taille des tuiles.
export const SPLIT_FLAP_TITLE_COLS = 32
export const SPLIT_FLAP_SECONDARY_COLS = 40
export const SPLIT_FLAP_NOTE_COLS = 40
export const SPLIT_FLAP_NOTE_ROWS = 3
export const SPLIT_FLAP_PAGE_DURATION_MS = 6000

const FALLBACK_TITLE = 'RADIO BLACKHOLE'
const FALLBACK_SECONDARY = 'LIVE WEB AUDIO STREAM'
const FALLBACK_NOTE = 'En attente du message performer.'
const FALLBACK_TICKER = 'RADIO ONLINE · LISTEN LIVE · WEBRTC STREAM'

export interface SplitFlapBoard {
  title: string
  secondary: string
  notePages: string[][]
  ticker: string
}

function pad(line: string, cols: number): string {
  const clean = line.length > cols ? line.slice(0, cols) : line
  return clean.padEnd(cols, ' ')
}

// Wrap mot par mot sur `cols` caractères. ponytail: wrap simple, pas de
// césure fine — suffisant pour un affichage radio.
function wrapWords(text: string, cols: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w
    if (candidate.length > cols) {
      if (cur) lines.push(cur)
      // mot seul plus long que la ligne : on le coupe brutalement.
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

// Découpe un texte en pages de NOTE_ROWS lignes chacune.
function toPages(text: string, cols: number, rows: number): string[][] {
  const lines = wrapWords(text.toUpperCase(), cols)
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += rows) {
    const page = lines.slice(i, i + rows).map((l) => pad(l, cols))
    while (page.length < rows) page.push(pad('', cols))
    pages.push(page)
  }
  return pages.length > 0 ? pages : [Array.from({ length: rows }, () => pad('', cols))]
}

/**
 * Transforme un BroadcastMessage en contenu prêt pour le panneau split-flap :
 * titre (1 ligne), secondaire (1 ligne), note paginée, ticker. Fallbacks si
 * champs vides. Uppercase partout (look affichage gare).
 */
export function formatBroadcastMessage(message: BroadcastMessage | null): SplitFlapBoard {
  const m = message
  const titleRaw = (m?.mainTitle?.trim() || FALLBACK_TITLE).toUpperCase()
  const secondaryParts = [m?.subtitle, m?.artist, m?.album]
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0)
  const secondaryRaw = (secondaryParts.length > 0 ? secondaryParts.join(' · ') : FALLBACK_SECONDARY).toUpperCase()
  const noteRaw = (m?.note?.trim() || FALLBACK_NOTE).toUpperCase()
  const tickerRaw = (m?.ticker?.trim() || FALLBACK_TICKER).toUpperCase()

  const notePages = toPages(noteRaw, SPLIT_FLAP_NOTE_COLS, SPLIT_FLAP_NOTE_ROWS)

  // displayMode 'static' → on ne garde que la première page (pas de cycle).
  if (m?.displayMode === 'static' && notePages.length > 1) {
    return {
      title: pad(titleRaw, SPLIT_FLAP_TITLE_COLS),
      secondary: pad(secondaryRaw, SPLIT_FLAP_SECONDARY_COLS),
      notePages: [notePages[0]],
      ticker: tickerRaw,
    }
  }

  return {
    title: pad(titleRaw, SPLIT_FLAP_TITLE_COLS),
    secondary: pad(secondaryRaw, SPLIT_FLAP_SECONDARY_COLS),
    notePages,
    ticker: tickerRaw,
  }
}