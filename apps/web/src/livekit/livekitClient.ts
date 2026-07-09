import { Room } from 'livekit-client'
import { fetchToken, type Role } from '../api/token'
import { FAKE_CONFIG_HINT, looksFakeUrl } from '../api/config'

export interface ConnectArgs {
  role: Role
  identity: string
  roomName: string
}

export interface ConnectResult {
  room: Room
  url: string
  roomName: string
  identity: string
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Récupère un token (via /api/token) puis connecte une Room LiveKit.
 * Le serveur ne transporte pas l'audio : on ne fait que signer le token et
 * ouvrir la room WebRTC.
 */
export async function connectToRoom({ role, identity, roomName }: ConnectArgs): Promise<ConnectResult> {
  let url: string
  let token: string
  try {
    const r = await fetchToken({ roomName, identity, role })
    url = r.url
    token = r.token
  } catch (e) {
    throw new Error(`Token indisponible : ${describe(e)}`)
  }

  if (!url) {
    throw new Error('URL LiveKit absente (LIVEKIT_URL non configurée côté serveur).')
  }

  const room = new Room()
  try {
    await room.connect(url, token)
  } catch (e) {
    // URL factice (.env.example / test) → message dédié et actionnable.
    if (looksFakeUrl(url)) {
      throw new Error(`Connexion LiveKit échouée. ${FAKE_CONFIG_HINT}`)
    }
    throw new Error(`Connexion LiveKit échouée : ${describe(e)}`)
  }

  return { room, url, roomName, identity }
}