import type { ResolvedVisual } from '../splitflap/visual'
import {
  wrapWords,
  centerLine,
  notePagesRaw,
  SPLIT_FLAP_TITLE_COLS,
  SPLIT_FLAP_NOTE_COLS,
  type SplitFlapBoard,
} from '../splitflap/format'

export interface HotFxLayout {
  titleText: string
  titleHeight: number
  secondaryText: string
  secondaryHeight: number
  // Pages non paddées (noteRowsMax lignes max) — le consommateur choisit la page
  // et calcule la hauteur (auto = lignes réelles clamp min..max ; fixed = max).
  notePages: string[][]
}

// Titre : wrap sur 32 cols, max 2 lignes, chacune centrée. Hauteur = nb de lignes.
function titleLines(raw: string): string[] {
  return wrapWords(raw, SPLIT_FLAP_TITLE_COLS)
    .slice(0, 2)
    .map((l) => centerLine(l, SPLIT_FLAP_TITLE_COLS))
}

/** Calcule le layout HotFX (zones + hauteurs) depuis le board formaté et le
 *  visual résolu. Title 1–2 lignes selon longueur ; secondary 0/1 si vide ;
 *  note paginée en pages de noteRowsMax lignes (non paddées → hauteur dynamique).
 */
export function hotfxLayout(board: SplitFlapBoard, v: ResolvedVisual): HotFxLayout {
  const tLines = titleLines(board.titleRaw)
  const hasSecondary = board.secondary.trim().length > 0
  return {
    titleText: tLines.join('\n'),
    titleHeight: tLines.length,
    secondaryText: hasSecondary ? board.secondary : '',
    secondaryHeight: hasSecondary ? 1 : 0,
    notePages: notePagesRaw(board.noteRaw, SPLIT_FLAP_NOTE_COLS, v.noteRowsMax),
  }
}

// Hauteur de la note pour une page donnée :
//  - auto : lignes réelles clamp noteRowsMin..noteRowsMax
//  - fixed : toujours noteRowsMax (remplit)
export function noteHeightFor(v: ResolvedVisual, linesCount: number): number {
  if (v.hotfxHeightMode === 'fixed') return v.noteRowsMax
  return Math.max(v.noteRowsMin, Math.min(v.noteRowsMax, linesCount))
}