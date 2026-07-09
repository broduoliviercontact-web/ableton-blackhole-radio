import { Router } from 'express'
import { config } from '../config'

// Heuristique "URL factice" : les placeholders .env.example utilisent example.com.
function looksFake(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === 'example.com' || host.endsWith('.example.com')
  } catch {
    return false
  }
}

export const configRouter = Router()

// Debug local uniquement. Ne renvoie QUE des booléens — jamais la clé ou le secret.
configRouter.get('/config-check', (_req, res) => {
  const livekitUrlConfigured = Boolean(config.LIVEKIT_URL)
  const livekitKeyConfigured = Boolean(config.LIVEKIT_API_KEY)
  const livekitSecretConfigured = Boolean(config.LIVEKIT_API_SECRET)
  const livekitUrlLooksFake = looksFake(config.LIVEKIT_URL)
  const ok = livekitUrlConfigured && livekitKeyConfigured && livekitSecretConfigured && !livekitUrlLooksFake
  res.json({
    ok,
    livekitUrlConfigured,
    livekitKeyConfigured,
    livekitSecretConfigured,
    livekitUrlLooksFake,
  })
})