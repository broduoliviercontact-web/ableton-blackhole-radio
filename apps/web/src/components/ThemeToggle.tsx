import { useCallback, useState } from 'react'

// Thème public Day / Night. data-theme posé sur <html> avant le paint par
// l'inline script de index.html (anti-FOUC, localStorage > prefers light > dark).
// Ici on lit l'état courant depuis le DOM (déjà correct au 1er render) puis on
// bascule + persiste. Aucune synchro backend, aucun flash.

export type Theme = 'light' | 'dark'

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

/** Bouton Day / Night accessible (aria-pressed = dark actif). Présentationnel. */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="pub-theme"
      onClick={onToggle}
      aria-pressed={dark}
      aria-label={`Basculer en mode ${dark ? 'clair' : 'sombre'}`}
      title="Thème jour / nuit"
    >
      {dark ? '☾ NIGHT' : '☀ DAY'}
    </button>
  )
}