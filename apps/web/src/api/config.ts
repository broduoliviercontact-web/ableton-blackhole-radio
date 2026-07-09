// Diagnostic config LiveKit — booléens uniquement, jamais de secret.

export interface ConfigCheckResult {
  ok: boolean
  livekitUrlConfigured: boolean
  livekitKeyConfigured: boolean
  livekitSecretConfigured: boolean
  livekitUrlLooksFake: boolean
}

export const FAKE_CONFIG_HINT =
  'LiveKit semble configuré avec des valeurs factices. Renseigne un vrai LIVEKIT_URL / KEY / SECRET dans .env puis relance le serveur.'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export function looksFakeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === 'example.com' || host.endsWith('.example.com')
  } catch {
    return false
  }
}

export async function fetchConfigCheck(): Promise<ConfigCheckResult> {
  const res = await fetch(`${API_BASE}/api/config-check`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as ConfigCheckResult
}