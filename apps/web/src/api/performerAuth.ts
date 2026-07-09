import { API_BASE } from './base'

// Vérifie un mot de passe performer auprès du backend (sans émettre de token).
// 200 → ok. 401/503 → throw avec le message serveur.
export async function checkPerformerPassword(performerPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/performer-auth/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performerPassword }),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      // body non-JSON, on garde le status
    }
    throw new Error(detail)
  }
}