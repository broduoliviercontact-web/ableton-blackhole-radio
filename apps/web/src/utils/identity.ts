// Identity stable par session navigateur (sessionStorage). Aucune info sensible.
// Une identity par préfixe (performer / listener), conservée pendant la session.

const KEY = 'abr:identity'

interface IdentityMap {
  [prefix: string]: string
}

function readMap(): IdentityMap {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as IdentityMap
  } catch {
    return {}
  }
}

function writeMap(map: IdentityMap): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // sessionStorage indisponible (mode privé, etc.) — on continue sans persister
  }
}

/**
 * Retourne une identity stable pour le préfixe donné pendant la session.
 * Format : `<prefix>-<6 chars aléatoires>`.
 */
export function getOrCreateIdentity(prefix: string): string {
  const map = readMap()
  const existing = map[prefix]
  if (existing) return existing
  const id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`
  map[prefix] = id
  writeMap(map)
  return id
}