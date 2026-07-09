import { useEffect, useState } from 'react'

// Fenêtre de texte défilant pour le mode note « scroll » : une grille
// `rows × width` fixe, le contenu se décale de `step` caractères tous les
// `speedMs` ms. Les cases restent fixes, le contenu avance caractère par
// caractère — vrai bandeau de gare à l'intérieur du split-flap.
//
//   - loop true  : défilement infini (le texte reboucle, modulo longueur).
//   - loop false : s'arrête quand la fin du texte est visible (queue paddée).
//   - enabled false : pas de tick (retourne la fenêtre initiale, non utilisée).
//
// ponytail: scroll char-par-char sur un ruban unique — chaque ligne = une
// tranche consécutive du même texte (rows = bandeau multi-lignes cohérent).
// Pas de césure, pas de mesure de largeur : pur décalage d'index.

// Calcul pur de la fenêtre visible (séparé du hook pour être testé hors React).
// `text` est mis en uppercase ; chaque ligne fait exactement `width` caractères.
export function computeScrollLines(text: string, offset: number, width: number, rows: number, loop: boolean): string[] {
  const S = ((text || '').toUpperCase()) || ' '
  const L = S.length
  const lines: string[] = []
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let i = 0; i < width; i++) {
      const idx = offset + r * width + i
      line += loop ? S.charAt(idx % L) : idx < L ? S.charAt(idx) : ' '
    }
    lines.push(line)
  }
  return lines
}

export function useScrollingTextWindow(
  text: string,
  width: number,
  rows: number,
  speedMs: number,
  step: number,
  loop: boolean,
  enabled: boolean,
): string[] {
  const S = ((text || '').toUpperCase()) || ' '
  const L = S.length
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!enabled || speedMs <= 0 || step <= 0) return
    const t = window.setInterval(() => {
      setOffset((o) => {
        if (loop) return (o + step) % L
        const maxOff = Math.max(0, L - rows * width)
        const next = o + step
        return next >= maxOff ? maxOff : next
      })
    }, speedMs)
    return () => clearInterval(t)
  }, [enabled, speedMs, step, loop, L, rows, width])

  return computeScrollLines(text, offset, width, rows, loop)
}