import { SplitFlapTile } from './SplitFlapTile'
import { useSplitFlapVisual } from './SplitFlapContext'

interface Props {
  line: string // déjà paddée à la largeur voulue
}

/**
 * Une ligne de tuiles. Reçoit une string déjà paddée (espaces = tuiles vides).
 * `delay` par colonne = staggerDelayMs (contexte) → cascade du flip.
 */
export function SplitFlapLine({ line }: Props) {
  const { staggerDelayMs } = useSplitFlapVisual()
  return (
    <div className="sf-line">
      {line.split('').map((char, i) => (
        <SplitFlapTile key={i} char={char} blank={char === ' '} delay={Math.min(i, 40) * staggerDelayMs} />
      ))}
    </div>
  )
}