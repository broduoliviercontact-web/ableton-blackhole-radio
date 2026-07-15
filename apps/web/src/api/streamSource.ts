import { API_BASE } from './base'

export type StreamSource = 'livekit' | 'icecast'

export interface StreamSourceState {
  activeSource: StreamSource
  updatedAt: string
}

export const DEFAULT_STREAM_SOURCE_STATE: StreamSourceState = {
  activeSource: 'livekit',
  updatedAt: '',
}

export const ICECAST_STREAM_URL = (import.meta.env?.VITE_ICECAST_STREAM_URL ?? '').trim()

export function isStreamSource(value: unknown): value is StreamSource {
  return value === 'livekit' || value === 'icecast'
}

function parseStreamSourceState(input: unknown): StreamSourceState {
  if (!input || typeof input !== 'object') throw new Error('Réponse stream-source invalide.')
  const data = input as { activeSource?: unknown; updatedAt?: unknown }
  if (!isStreamSource(data.activeSource)) throw new Error('Source de stream invalide.')
  if (typeof data.updatedAt !== 'string') throw new Error('Date stream-source invalide.')
  return { activeSource: data.activeSource, updatedAt: data.updatedAt }
}

export async function fetchStreamSource(): Promise<StreamSourceState> {
  const res = await fetch(`${API_BASE}/api/stream-source`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return parseStreamSourceState(await res.json())
}

export async function putStreamSource(
  activeSource: StreamSource,
  performerPassword: string,
): Promise<StreamSourceState> {
  const res = await fetch(`${API_BASE}/api/stream-source`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeSource, performerPassword }),
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      // body non-JSON
    }
    throw new Error(detail)
  }
  return parseStreamSourceState(await res.json())
}
