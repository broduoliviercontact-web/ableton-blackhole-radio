import { timingSafeEqual } from 'node:crypto'

// Décide si un performer peut obtenir un token. Les listeners ne passent pas ici.
// Retourne ok:true si le mot de passe correspond, sinon 503 (serveur non configuré)
// ou 401 (mot de passe absent/incorrect). Comparaison timing-safe.
export function checkPerformerAccess(
  performerPassword: string | undefined,
  configuredPassword: string | undefined,
): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  if (!configuredPassword) {
    return { ok: false, status: 503, error: 'Mot de passe performer non configuré côté serveur.' }
  }
  if (!performerPassword) {
    return { ok: false, status: 401, error: 'Mot de passe performer invalide.' }
  }
  const a = Buffer.from(performerPassword)
  const b = Buffer.from(configuredPassword)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'Mot de passe performer invalide.' }
  }
  return { ok: true }
}