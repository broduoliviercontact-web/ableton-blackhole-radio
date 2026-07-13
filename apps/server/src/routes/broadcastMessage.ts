import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { checkPerformerAccess, parseAllowedPasswords } from '../performerAuth.js'
import { getBroadcastMessage, parseBroadcastMessage, setBroadcastMessage } from '../broadcastMessage.js'
import { createRateLimit } from '../rateLimit.js'

const bodySchema = z.object({
  performerPassword: z.string().optional(),
  message: z.unknown(),
})

export const broadcastMessageRouter = Router()

const broadcastWriteRateLimit = createRateLimit({
  keyPrefix: 'broadcast-message-write',
  max: 60,
  windowMs: 15 * 60 * 1000,
})

// Public : renvoie le message courant (ou null). Aucun secret, aucun password.
broadcastMessageRouter.get('/broadcast-message', (_req, res) => {
  res.json({ message: getBroadcastMessage() })
})

// Protégé par performerPassword. Met à jour le message courant en mémoire.
// 400 message invalide, 401 password invalide/absent, 503 non configuré.
broadcastMessageRouter.post('/broadcast-message', broadcastWriteRateLimit, (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'body invalide' })
    return
  }

  const allowed = parseAllowedPasswords(config.PERFORMER_PASSWORD, config.PERFORMER_PASSWORDS)
  const access = checkPerformerAccess(parsed.data.performerPassword, allowed)
  if (!access.ok) {
    res.status(access.status).json({ error: access.error })
    return
  }

  try {
    const message = parseBroadcastMessage(parsed.data.message)
    setBroadcastMessage(message)
    res.json({ ok: true, message })
  } catch (err) {
    const details =
      err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : 'message invalide'
    res.status(400).json({ error: details })
  }
})
