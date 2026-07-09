interface Props {
  text: string
}

/**
 * Ticker bas : défilement CSS continu (sf-scroll). On duplique le texte pour
 * une boucle sans vide ; prefers-reduced-motion l'arrête côté CSS.
 */
export function RadioTicker({ text }: Props) {
  return (
    <div className="sf-ticker" aria-label={text}>
      <span className="sf-ticker__track">
        {text} · {text}
      </span>
    </div>
  )
}