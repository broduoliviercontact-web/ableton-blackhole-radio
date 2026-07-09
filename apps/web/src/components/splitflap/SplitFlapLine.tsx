import { SplitFlapTile } from './SplitFlapTile'

interface Props {
  line: string // déjà paddée à la largeur voulue
}

/**
 * Une ligne de tuiles. Reçoit une string déjà paddée (espaces = tuiles vides).
 * `delay` par colonne → cascade du flip gauche→droite (effet vague mécanique).
 */
export function SplitFlapLine({ line }: Props) {
  return (
    <div className="sf-line">
      {line.split('').map((char, i) => (
        <SplitFlapTile key={i} char={char} blank={char === ' '} delay={Math.min(i, 40) * 12} />
      ))}
    </div>
  )
}