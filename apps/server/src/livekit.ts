import { AccessToken, type VideoGrant } from 'livekit-server-sdk'
import { config } from './config'

export type Role = 'performer' | 'listener'

export interface CreateTokenArgs {
  roomName: string
  identity: string
  role: Role
}

function grantsFor(role: Role, roomName: string): VideoGrant {
  // ponytail: canPublishSources laissé à défaut — Lot 2 forcera l'audio quand on publie.
  return {
    roomJoin: true,
    room: roomName,
    canPublish: role === 'performer',
    canSubscribe: true,
  }
}

export async function createToken({ roomName, identity, role }: CreateTokenArgs): Promise<{ token: string; url: string }> {
  const token = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, { identity })
  token.addGrant(grantsFor(role, roomName))
  return { token: await token.toJwt(), url: config.LIVEKIT_URL }
}