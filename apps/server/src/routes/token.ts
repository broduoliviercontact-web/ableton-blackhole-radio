import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { createToken } from '../livekit.js'
import { checkPerformerAccess, parseAllowedPasswords } from '../performerAuth.js'
import { createRateLimit } from '../rateLimit.js'

const bodySchema = z.object({
  roomName: z.string().min(1),
  identity: z.string().min(1),
  role: z.enum(['performer', 'listener']),
  // Requis pour role: "performer" (vérifié côté serveur). Ignéré pour les listeners.
  performerPassword: z.string().optional(),
})

export const tokenRouter = Router()

const performerTokenRateLimit = createRateLimit({
  keyPrefix: 'performer-token',
  max: 20,
  windowMs: 15 * 60 * 1000,
  skip: (req) => req.body?.role !== 'performer',
})

tokenRouter.post('/token', performerTokenRateLimit, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'body invalide', details: parsed.error.issues.map((i) => i.message).join('; ') })
    return
  }

  const { role } = parsed.data

  // Le mot de passe protège seulement les tokens performer (canPublish).
  // Les listeners restent publics.
  if (role === 'performer') {
    const allowed = parseAllowedPasswords(config.PERFORMER_PASSWORD, config.PERFORMER_PASSWORDS)
    const access = checkPerformerAccess(parsed.data.performerPassword, allowed)
    if (!access.ok) {
      res.status(access.status).json({ error: access.error })
      return
    }
  }

  try {
    const { token, url } = await createToken(parsed.data)
    res.json({ token, url })
  } catch (err) {
    console.error('token error:', err)
    res.status(500).json({ error: 'échec génération token' })
  }
})
