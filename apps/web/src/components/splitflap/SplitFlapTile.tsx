import { useEffect, useRef, useState } from 'react'

interface Props {
  char: string
  blank?: boolean
  delay?: number
}

const BLANK = ' '

function face(char: string): string {
  return char === BLANK ? '' : char
}

/**
 * Tuile split-flap animée. Le clapet (`.sf-flipper`) porte deux faces 3D :
 * front = caractère courant, back = caractère cible. Au changement de `char`,
 * on lance `rotateX(0 → -180deg)` : la face front (ancien) bascule, la face
 * back (nouveau) se révèle à mi-course — effet clapet mécanique. Au montage on
 * part du blanc → flip vers le caractère ("les lettres tournent à l'affarition").
 * `delay` cascade les tuiles d'une ligne pour un effet vague.
 */
export function SplitFlapTile({ char, blank, delay = 0 }: Props) {
  const [front, setFront] = useState(BLANK)
  const [back, setBack] = useState(char)
  const [flipping, setFlipping] = useState(char !== BLANK)
  const displayed = useRef(BLANK)

  useEffect(() => {
    if (char === displayed.current) return
    setFront(displayed.current)
    setBack(char)
    setFlipping(true)
  }, [char])

  return (
    <span className={`sf-tile${blank ? ' sf-tile--blank' : ''}`}>
      <span
        className={`sf-flipper${flipping ? ' sf-flipper--flip' : ''}`}
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
        onAnimationEnd={() => {
          displayed.current = char
          setFront(char)
          setFlipping(false)
        }}
      >
        <span className="sf-face sf-face--front">{face(front)}</span>
        <span className="sf-face sf-face--back">{face(back)}</span>
      </span>
    </span>
  )
}