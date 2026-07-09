// Typings du web component HotFX (MIT, vendored — voir hotfx-split-flap.js).
import type { CSSProperties, Ref } from 'react'

// Attributs réels du composant : width / height / duration (ms par chute de
// clapet — pas `speed`) / characters (alphabet). Pas d'attribut `speed`.
export interface HotFxSplitFlapElement extends HTMLElement {
  width: number
  height: number
  duration: number
  characters: string
}

interface HotFxSplitFlapAttributes {
  width?: number
  height?: number
  duration?: number
  characters?: string
  className?: string
  style?: CSSProperties
  ref?: Ref<HotFxSplitFlapElement>
}

// ponytail: le wrapper ne passe pas d'enfants JSX (textContent géré
// impérativement), mais on déclare l'intrinsèque pour rester typé.
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'hotfx-split-flap': HotFxSplitFlapAttributes
      }
    }
  }
}