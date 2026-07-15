import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  LIVEKIT_URL: z.url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  // Origine du frontend en production (CORS). Optionnel : absent en dev.
  WEB_ORIGIN: z.string().url().optional(),
  // Mot de passe protégeant la génération des tokens performer (canPublish).
  // Requis en production : si aucun mot de passe configuré, /api/token renvoie 503.
  // Jamais exposé au frontend, jamais loggé.
  PERFORMER_PASSWORD: z.string().optional(),
  // Optionnel : plusieurs mots de passe séparés par virgule (en plus du unique).
  PERFORMER_PASSWORDS: z.string().optional(),
  // Optionnel : fichier JSON où persister le message radio courant.
  BROADCAST_MESSAGE_STORE_PATH: z.string().optional(),
  // Optionnel : fichier JSON où persister la source diffusée aux auditeurs.
  STREAM_SOURCE_STORE_PATH: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Variables d’environnement invalides ou manquantes :')
  console.error(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'))
  process.exit(1)
}

export const config = parsed.data
