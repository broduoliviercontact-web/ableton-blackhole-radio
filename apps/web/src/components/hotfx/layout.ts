import type { ResolvedVisual } from '../splitflap/visual'
import { wrapAligned, notePagesRawAligned, trimEmptyDisplayLines, type SplitFlapBoard } from '../splitflap/format'

export interface HotFxLayout {
  titleText: string
  titleHeight: number
  secondaryText: string
  secondaryHeight: number
  // Pages non paddées (noteRowsMax lignes max) — le consommateur choisit la page
  // et calcule la hauteur (auto = lignes réelles clamp min..max ; fixed = max).
  notePages: string[][]
}

/** Calcule le layout HotFX (zones + hauteurs) depuis le board formaté et le
 *  visual résolu. Title 1–3 lignes (layout.titleRows, aligné titleAlign) ;
 *  secondary 0/1/2 lignes (layout.secondaryRows, 0 = caché, aligné secondaryAlign) ;
 *  note paginée en pages de noteRowsMax lignes (alignée noteAlign, non paddées
 *  → hauteur dynamique).
 */
export function hotfxLayout(board: SplitFlapBoard, v: ResolvedVisual): HotFxLayout {
  const cols = v.layout.boardColumns
  const tLines = wrapAligned(board.titleRaw, cols, v.layout.titleRows, v.layout.titleAlign)
  const hasSecondary = board.secondaryRaw.trim().length > 0
  const secondaryRows = v.layout.secondaryRows
  return {
    titleText: tLines.join('\n'),
    titleHeight: tLines.length,
    secondaryText: hasSecondary
      ? wrapAligned(board.secondaryRaw, cols, secondaryRows, v.layout.secondaryAlign).join('\n')
      : '',
    secondaryHeight: hasSecondary ? secondaryRows : 0,
    notePages: notePagesRawAligned(board.noteRaw, cols, v.noteRowsMax, v.layout.noteAlign).map(trimEmptyDisplayLines),
  }
}

// Hauteur de la note pour une page donnée :
//  - auto : lignes réelles clamp noteRowsMin..noteRowsMax
//  - fixed : toujours noteRowsMax (remplit)
export function noteHeightFor(v: ResolvedVisual, linesCount: number): number {
  if (v.hotfxHeightMode === 'fixed') return v.noteRowsMax
  return Math.max(v.noteRowsMin, Math.min(v.noteRowsMax, linesCount))
}