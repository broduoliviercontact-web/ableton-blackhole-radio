import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { z } from 'zod'

export type StreamSource = 'livekit' | 'icecast'

export interface StreamSourceState {
  activeSource: StreamSource
  updatedAt: string
}

const sourceSchema = z.enum(['livekit', 'icecast'])
const persistedStateSchema = z
  .object({
    activeSource: sourceSchema,
    updatedAt: z.string().min(1),
  })
  .strict()

export const DEFAULT_STREAM_SOURCE_STATE: StreamSourceState = {
  activeSource: 'livekit',
  updatedAt: '',
}

export function parseStreamSource(input: unknown): StreamSource {
  return sourceSchema.parse(input)
}

function normalizeState(activeSource: StreamSource, updatedAt: string): StreamSourceState {
  return { activeSource, updatedAt }
}

const DEFAULT_STORE_PATH = 'server/data/stream-source.json'

function resolveStorePath(): string {
  const raw = process.env.STREAM_SOURCE_STORE_PATH?.trim() || DEFAULT_STORE_PATH
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw)
}

const storePath = resolveStorePath()

function readStoredState(): StreamSourceState {
  if (!existsSync(storePath)) return DEFAULT_STREAM_SOURCE_STATE
  try {
    const parsed = persistedStateSchema.parse(JSON.parse(readFileSync(storePath, 'utf8')))
    return normalizeState(parsed.activeSource, parsed.updatedAt)
  } catch (err) {
    console.warn(`stream source store ignored (${storePath}):`, err instanceof Error ? err.message : String(err))
    return DEFAULT_STREAM_SOURCE_STATE
  }
}

function writeStoredState(state: StreamSourceState): void {
  try {
    mkdirSync(dirname(storePath), { recursive: true })
    const tmpPath = `${storePath}.tmp`
    writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    renameSync(tmpPath, storePath)
  } catch (err) {
    console.error(`stream source store write failed (${storePath}):`, err)
  }
}

let current = readStoredState()

export function getStreamSourceState(): StreamSourceState {
  return current
}

export function setStreamSource(activeSource: StreamSource): StreamSourceState {
  current = normalizeState(activeSource, new Date().toISOString())
  writeStoredState(current)
  return current
}
