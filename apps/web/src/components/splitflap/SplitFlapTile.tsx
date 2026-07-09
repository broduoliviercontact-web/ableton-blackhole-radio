import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSplitFlapVisual } from './SplitFlapContext'

interface Props {
  char: string
  blank?: boolean
  delay?: number
}

const BLANK = ' '
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:-/.'

function face(char: string): string {
  return char === BLANK ? '' : char
}

function randomChar(): string {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
}

/**
 * Tuile split-flap animée. Quatre transitions (via le contexte visuel) :
 *  - flip         : clapet 3D rotateX (face avant=ancien, arrière=nouveau).
 *  - instant      : pas d'animation, caractère posé direct.
 *  - scramble     : lettres aléatoires pendant scrambleDurationMs puis pose.
 *  - flip-scramble : scramble puis un flip final vers le caractère.
 *
 * `delay` (cascade par colonne) décale le démarrage. Les couleurs scramble
 * cyclent dans `scrambleColors` (sinon couleur de texte par défaut).
 * Au montage on part du blanc → animation à l'apparition.
 */
export function SplitFlapTile({ char, blank, delay = 0 }: Props) {
  const v = useSplitFlapVisual()
  const [front, setFront] = useState(BLANK) // face visible (ou ancien pendant flip)
  const [back, setBack] = useState(char) // face arrière (nouveau pendant flip)
  const [flipping, setFlipping] = useState(false)
  const [scrambleColor, setScrambleColor] = useState<string | undefined>(undefined)
  const displayed = useRef(BLANK) // dernier caractère posé
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t)
    timers.current = []
  }

  useEffect(() => {
    if (char === displayed.current) return
    const target = char
    clearTimers()
    setScrambleColor(undefined)

    if (v.transition === 'instant') {
      displayed.current = target
      setFront(target)
      return
    }

    const useScramble = v.transition === 'scramble' || v.transition === 'flip-scramble'
    const useFlip = v.transition === 'flip' || v.transition === 'flip-scramble'

    const settle = () => {
      if (useFlip) {
        // flip final vers le caractère cible.
        setFront(displayed.current === BLANK ? randomChar() : displayed.current)
        setBack(target)
        setFlipping(true)
      } else {
        displayed.current = target
        setFront(target)
        setScrambleColor(undefined)
      }
    }

    if (useScramble) {
      const ticks = Math.max(4, Math.round(v.scrambleDurationMs / 60))
      const tick = (i: number) => {
        if (i >= ticks) {
          settle()
          return
        }
        setFront(randomChar())
        setScrambleColor(v.scrambleColors.length > 0 ? v.scrambleColors[i % v.scrambleColors.length] : undefined)
        timers.current.push(window.setTimeout(() => tick(i + 1), 60))
      }
      timers.current.push(window.setTimeout(() => tick(0), delay))
    } else {
      // flip simple.
      setFront(displayed.current === BLANK ? BLANK : displayed.current)
      setBack(target)
      setFlipping(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, v.transition, v.scrambleDurationMs, v.scrambleColors, delay])

  useEffect(() => () => clearTimers(), [])

  const frontStyle: CSSProperties | undefined = scrambleColor ? { color: scrambleColor } : undefined

  return (
    <span className={`sf-tile${blank ? ' sf-tile--blank' : ''}`}>
      <span
        className={`sf-flipper${flipping ? ' sf-flipper--flip' : ''}`}
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
        onAnimationEnd={() => {
          displayed.current = back
          setFront(back)
          setFlipping(false)
        }}
      >
        <span className="sf-face sf-face--front" style={frontStyle}>
          {face(front)}
        </span>
        <span className="sf-face sf-face--back">{face(back)}</span>
      </span>
    </span>
  )
}