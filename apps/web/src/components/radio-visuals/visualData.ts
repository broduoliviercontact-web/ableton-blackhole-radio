import type { RadioMessage, RadioVisualData } from './radioVisualTypes'

const FALLBACK_TITLE = 'RADIO BLACKHOLE'
const FALLBACK_NOTE = 'EN ATTENTE D UNE TRANSMISSION.'

/** Normalise le message, pour que chaque moteur lise exactement les memes donnees. */
export function toRadioVisualData(message: RadioMessage): RadioVisualData {
  const title = message?.mainTitle?.trim() || FALLBACK_TITLE
  const secondary = [message?.subtitle, message?.artist, message?.album]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' // ') || 'LIVE WEB AUDIO STREAM'
  return {
    brand: message?.brandLabel?.trim() || 'RADIO BLACKHOLE',
    title,
    secondary,
    note: message?.note?.trim() || FALLBACK_NOTE,
    ticker: message?.ticker?.trim() || 'RADIO BLACKHOLE · PIRATE WEBRTC STREAM · LISTEN LIVE',
    type: message?.type ?? 'announcement',
    updatedAt: message && 'updatedAt' in message ? message.updatedAt : null,
  }
}
