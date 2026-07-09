interface Props {
  char: string // 1 caractère, ou ' ' pour tuile vide
  blank?: boolean
}

/**
 * Tuile split-flap : un caractère dans un clapet. Le contenu interne est
 * `key`é sur le caractère → React remonte l'élément au changement et rejoue
 * l'animation CSS `sf-flip` (voir splitflap.css). prefers-reduced-motion la
 * neutralise côté CSS.
 */
export function SplitFlapTile({ char, blank }: Props) {
  return (
    <span className={`sf-tile${blank ? ' sf-tile--blank' : ''}`}>
      {/* key=char → remontage au changement → flip. ponytail: pas de machine
          d'état d'animation, on s'appuie sur le remontage React. */}
      <span key={char} className="sf-tile__inner">
        {char === ' ' ? '' : char}
      </span>
    </span>
  )
}