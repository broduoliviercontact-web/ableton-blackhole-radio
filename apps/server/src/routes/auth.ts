import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { checkPerformerAccess, parseAllowedPasswords } from '../performerAuth.js'

const bodySchema = z.object({
  performerPassword: z.string().optional(),
})

export const authRouter = Router()

// Vérifie un mot de passe performer sans émettre de token. Réutilise la même
// logique que /api/token (parseAllowedPasswords / checkPerformerAccess).
// 200 si valide, 401 si absent/invalide, 503 si non configuré côté serveur.
// Ne retourne ni ne logge jamais le mot de passe.
authRouter.post('/performer-auth/check', (req, res) => {
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
  res.json({ ok: true })
})