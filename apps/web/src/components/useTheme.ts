import { useCallback, useState } from 'react'
import type { Theme } from './ThemeToggle'

const KEY = 'radio.theme'

/** État thème + toggle. Lit data-theme (posé par le script FOUC) au montage. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'),
  )

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* mode privé / quota : on garde la valeur en mémoire seulement */
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
