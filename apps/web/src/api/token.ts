export type Role = 'performer' | 'listener'

export interface TokenResponse {
  token: string
  url: string
}

// En dev, Vite proxy /api -> http://localhost:3001 (vite.config.ts).
// En prod, définir VITE_API_BASE (ex: https://api.example.com).
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function fetchToken(args: {
  roomName: string
  identity: string
  role: Role
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