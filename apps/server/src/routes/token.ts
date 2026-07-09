import { Router } from 'express'
import { z } from 'zod'
import { createToken } from '../livekit'

const bodySchema = z.object({
  roomName: z.string().min(1),
  identity: z.string().min(1),
  role: z.enum(['performer', 'listener']),
})

export const tokenRouter = Router()

tokenRouter.post('/token', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'body invalide', details: parsed.error.issues.map((i) => i.message).join('; ') })
    return
  }

  try {
    const { token, url } = await createToken(parsed.data)
    res.json({ token, url })
  } catch (err) {
    console.error('token error:', err)
    res.status(500).json({ error: 'échec génération token' })
  }
})