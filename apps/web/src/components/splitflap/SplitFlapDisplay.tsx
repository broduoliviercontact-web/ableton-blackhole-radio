import { SplitFlapLine } from './SplitFlapLine'

export type SplitFlapVariant = 'title' | 'secondary' | 'note'

interface Props {
  lines: string[]
  variant: SplitFlapVariant
}

/**
 * Panneau split-flap : empile des `SplitFlapLine`. La variante pilote la
 * taille des tuiles via la classe `sf-<variant>` (voir splitflap.css).
 */
export function SplitFlapDisplay({ lines, variant }: Props) {
  return (
    <div className={`sf-board sf-${variant}`}>
      {lines.map((line, i) => (
        <SplitFlapLine key={i} line={line} />
      ))}
    </div>
  )
}