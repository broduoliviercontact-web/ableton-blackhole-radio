import { SplitFlapTile } from './SplitFlapTile'

interface Props {
  line: string // déjà paddée à la largeur voulue
}

/**
 * Une ligne de tuiles. Reçoit une string déjà paddée (espaces de fin =
 * tuiles vides). Chaque tuile est `key`é par sa position (la ligne est
 * stable ; seul le contenu d'une tuile flip au changement).
 */
export function SplitFlapLine({ line }: Props) {
  return (
    <div className="sf-line">
      {line.split('').map((char, i) => (
        <SplitFlapTile key={i} char={char} blank={char === ' '} />
      ))}
    </div>
  )
}