import { API_BASE } from './base'

export type Role = 'performer' | 'listener'

export interface TokenResponse {
  token: string
  url: string
}

export async function fetchToken(args: {
  roomName: string
  identity: string
  role: Role
  // Requis pour role: "performer" (vérifié côté serveur). Ignéré pour les listeners.
  performerPassword?: string
}): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
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

  return (await res.json()) as TokenResponse
}