import { useId, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'

interface Props {
  text: string
  /** Courte étiquette du champ (pour aria-label). */
  label?: string
}

// Tooltip d'aide performer : icône `?` ronde, bulle anthracite + accent jaune.
// Hover/focus → bulle ; clic/tap → bascule (mobile) ; Escape ferme. La bulle
// reste dans le DOM (visibility) pour qu'aria-describedby soit lisible au
// lecteur d'écran même fermée. position:absolute + z-index élevé → passe
// au-dessus des select/input, non coupé (aucun parent du form n'a overflow
// hidden). ponytail: zéro dépendance, state local minimal.
export function HelpTooltip({ text, label }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const ariaLabel = label ? `Aide : ${label}` : 'Aide'

  return (
    <span style={wrapStyle}>
      <button
        type="button"
        style={iconStyle}
        aria-label={ariaLabel}
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Escape') setOpen(false)
        }}
      >
        ?
      </button>
      <span id={id} role="tooltip" style={{ ...bubbleStyle, visibility: open ? 'visible' : 'hidden' }}>
        {text}
      </span>
    </span>
  )
}

const wrapStyle: CSSProperties = { position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }
const iconStyle: CSSProperties = {
  width: 16,
  height: 16,
  minWidth: 16,
  borderRadius: '50%',
  border: '1px solid #f5d76b',
  color: '#f5d76b',
  background: '#14161e',
  fontSize: 10,
  fontWeight: 700,
  lineHeight: '14px',
  padding: 0,
  cursor: 'help',
}
const bubbleStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: 0,
  zIndex: 1000,
  maxWidth: 280,
  width: 'max-content',
  background: '#1f232c',
  color: '#f2ead2',
  border: '1px solid #f5d76b',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.4,
  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
  whiteSpace: 'normal',
  pointerEvents: 'none',
}