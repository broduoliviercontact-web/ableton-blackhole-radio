import { timingSafeEqual } from 'node:crypto'

// Construit la liste normalisée des mots de passe autorisés :
// PERFORMER_PASSWORD (unique) + PERFORMER_PASSWORDS (séparés par virgule).
// trim chaque valeur, ignore les vides. La liste n'est jamais exposée.
export function parseAllowedPasswords(single?: string, multi?: string): string[] {
  const raw = [single, ...(multi ? multi.split(',') : [])]
  return raw.map((p) => (p ?? '').trim()).filter((p) => p.length > 0)
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

// Décide si un performer peut obtenir un token. Les listeners ne passent pas ici.
// 503 si aucun mot de passe configuré, 401 si absent/incorrect. Comparaison timing-safe.
export function checkPerformerAccess(
  performerPassword: string | undefined,
  allowed: string[],
): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  if (allowed.length === 0) {
    return { ok: false, status: 503, error: 'Mot de passe performer non configuré côté serveur.' }
  }
  if (!performerPassword) {
    return { ok: false, status: 401, error: 'Mot de passe performer invalide.' }
  }
  if (!allowed.some((p) => safeEqual(performerPassword, p))) {
    return { ok: false, status: 401, error: 'Mot de passe performer invalide.' }
  }
  return { ok: true }
}