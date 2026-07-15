import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { checkPerformerAccess, parseAllowedPasswords } from '../performerAuth.js'
import { getStreamSourceState, setStreamSource } from '../streamSource.js'

const bodySchema = z
  .object({
    activeSource: z.enum(['livekit', 'icecast']),
    performerPassword: z.string().optional(),
  })
  .strict()

export const streamSourceRouter = Router()

streamSourceRouter.get('/stream-source', (_req, res) => {
  res.json(getStreamSourceState())
})

streamSourceRouter.put('/stream-source', (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'body invalide', details: parsed.error.issues.map((i) => i.message).join('; ') })
    return
  }

  const allowed = parseAllowedPasswords(config.PERFORMER_PASSWORD, config.PERFORMER_PASSWORDS)
  const access = checkPerformerAccess(parsed.data.performerPassword, allowed)
  if (!access.ok) {
    res.status(access.status).json({ error: access.error })
    return
  }

  res.json(setStreamSource(parsed.data.activeSource))
})
