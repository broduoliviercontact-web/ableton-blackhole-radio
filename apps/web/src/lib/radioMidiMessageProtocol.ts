// Radio MIDI Message Bridge — protocole v1.
// Lib partagée encode/decode du paquet radio-midi-message. Utilisée par :
//   - le générateur .mid de /performer (apps/web/src/pages/Performer.tsx)
//   - les selfchecks (apps/web/selfcheck.ts)
// Le décodeur Max (tools/max/radio-midi-message-bridge/radio_midi_bridge.js) est une
// traduction JS standalone de cette lib (Max ne peut pas importer du TS).
//
// ponytail: aucune dépendance. Base64 via btoa/atob + TextEncoder/TextDecoder (globals
// navigateur ET Node 18+, donc selfcheck tsx marche aussi). UTF-8 géré pour les accents
// français. Doc protocole : apps/docs/radio-midi-message-bridge.md.

export type RadioMidiPacket = {
  protocol: 'radio-midi-message'
  version: 1
  eventId: string
  createdAt?: string
  message: unknown
  checksum?: string
}

export const RADIO_MIDI_PROTOCOL = 'radio-midi-message'
export const RADIO_MIDI_VERSION = 1
// Canal utilisateur 1–16 côté Max UI. Raw (status byte / parseurs bas niveau) = 15.
export const RADIO_MIDI_CHANNEL = 16
export const RADIO_MIDI_CHANNEL_RAW = 15
export const MIDI_START_MESSAGE = 1
export const MIDI_END_MESSAGE = 2
export const MIDI_CLEAR_BUFFER = 3
// Longueur max recommandée v1 du Base64 transporté (≈ 3 KB JSON utile).
export const RADIO_MIDI_MAX_BASE64_LENGTH = 4096
// Fenêtre anti-duplication eventId (ms) : même eventId dans cette fenêtre = non republié.
export const RADIO_MIDI_DUP_WINDOW_MS = 2000

// --- UTF-8 ↔ Base64 (accents français) -------------------------------------

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function base64ToUtf8(b64: string): string {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// --- Checksum v1 : somme charCodes mod 65535, hex minuscule ----------------
// Calculé sur la chaîne Base64 du paquet SANS checksum. Détecte les transmissions
// incomplètes (notes manquantes). Pas une protection cryptographique.

export function computeRadioMidiChecksum(input: string): string {
  let sum = 0
  for (let i = 0; i < input.length; i++) sum = (sum + input.charCodeAt(i)) % 65535
  return sum.toString(16)
}

// --- Paquet ----------------------------------------------------------------

export function createRadioMidiPacket(eventId: string, message: unknown): RadioMidiPacket {
  if (typeof eventId !== 'string' || eventId.length === 0) {
    throw new Error('radio-midi: eventId requis (string non vide)')
  }
  return {
    protocol: RADIO_MIDI_PROTOCOL,
    version: RADIO_MIDI_VERSION,
    eventId,
    createdAt: new Date().toISOString(),
    message,
  }
}

// Retire le champ checksum pour (re)sérialiser le corps du paquet.
function stripChecksum(packet: RadioMidiPacket): Omit<RadioMidiPacket, 'checksum'> {
  const { checksum: _omit, ...rest } = packet
  void _omit
  return rest
}

// Sérialise le paquet complet (avec checksum calculé sur le corps) en Base64.
export function encodePacketToBase64(packet: RadioMidiPacket): string {
  assertPacketShape(packet, /* requireMessage */ true)
  const body64 = utf8ToBase64(JSON.stringify(stripChecksum(packet)))
  const checksum = computeRadioMidiChecksum(body64)
  const full: RadioMidiPacket = { ...packet, checksum }
  const b64 = utf8ToBase64(JSON.stringify(full))
  if (b64.length > RADIO_MIDI_MAX_BASE64_LENGTH) {
    throw new Error(
      `radio-midi: payload Base64 trop long (${b64.length} > ${RADIO_MIDI_MAX_BASE64_LENGTH}). Raccourcir le message.`,
    )
  }
  return b64
}

export function decodePacketFromBase64(base64: string): RadioMidiPacket {
  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new Error('radio-midi: base64 vide')
  }
  let pkt: RadioMidiPacket
  try {
    pkt = JSON.parse(base64ToUtf8(base64)) as RadioMidiPacket
  } catch (e) {
    throw new Error(`radio-midi: décode JSON échoué (${(e as Error).message})`)
  }
  assertPacketShape(pkt, true)
  // Vérifie le checksum si présent (recalcule sur le corps sérialisé).
  if (pkt.checksum !== undefined) {
    const body64 = utf8ToBase64(JSON.stringify(stripChecksum(pkt)))
    const expected = computeRadioMidiChecksum(body64)
    if (expected !== pkt.checksum) {
      throw new Error(`radio-midi: checksum mismatch (attendu ${expected}, reçu ${pkt.checksum})`)
    }
  }
  return pkt
}

// --- Notes MIDI ------------------------------------------------------------

// Un pitch est une note Base64 valide s'il correspond à un caractère Base64
// (A-Z a-z 0-9 + / =). Les notes de contrôle 1/2/3 ne le sont pas.
export function isValidBase64MidiNote(note: number): boolean {
  if (!Number.isInteger(note)) return false
  return (
    note === 43 || // +
    note === 47 || // /
    note === 61 || // =
    (note >= 48 && note <= 57) || // 0-9
    (note >= 65 && note <= 90) || // A-Z
    (note >= 97 && note <= 122) // a-z
  )
}

export function base64ToMidiNotes(base64: string): number[] {
  if (typeof base64 !== 'string' || base64.length === 0) {
    throw new Error('radio-midi: base64 vide')
  }
  const notes: number[] = []
  for (let i = 0; i < base64.length; i++) {
    const pitch = base64.charCodeAt(i)
    if (!isValidBase64MidiNote(pitch)) {
      throw new Error(`radio-midi: caractère Base64 invalide '${base64[i]}' (pitch ${pitch})`)
    }
    notes.push(pitch)
  }
  return notes
}

export function midiNotesToBase64(notes: number[]): string {
  if (!Array.isArray(notes)) throw new Error('radio-midi: notes attendues (tableau)')
  let out = ''
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    if (typeof n !== 'number' || n < 0 || n > 127) {
      throw new Error(`radio-midi: note hors plage 0–127 à l'index ${i} (${n})`)
    }
    if (!isValidBase64MidiNote(n)) {
      throw new Error(`radio-midi: note payload non-Base64 à l'index ${i} (${n})`)
    }
    out += String.fromCharCode(n)
  }
  return out
}

export function encodePacketToMidiNotes(packet: RadioMidiPacket): number[] {
  const base64 = encodePacketToBase64(packet)
  const payload = base64ToMidiNotes(base64)
  return [MIDI_START_MESSAGE, ...payload, MIDI_END_MESSAGE]
}

export function decodePacketFromMidiNotes(notes: number[]): RadioMidiPacket {
  if (!Array.isArray(notes) || notes.length < 2) {
    throw new Error('radio-midi: notes vides ou trop courtes (START+END minimum)')
  }
  if (notes[0] !== MIDI_START_MESSAGE) {
    throw new Error('radio-midi: START_MESSAGE manquant en tête')
  }
  if (notes[notes.length - 1] !== MIDI_END_MESSAGE) {
    throw new Error('radio-midi: END_MESSAGE manquant en fin')
  }
  // Refuse toute note hors 0–127 (y compris contrôle 3/CLEAR dans le payload).
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    if (typeof n !== 'number' || n < 0 || n > 127) {
      throw new Error(`radio-midi: note hors plage 0–127 à l'index ${i} (${n})`)
    }
  }
  const payload = notes.slice(1, -1)
  // CLEAR (3) ou tout pitch non-Base64 dans le payload → rejeté par midiNotesToBase64.
  const base64 = midiNotesToBase64(payload)
  return decodePacketFromBase64(base64)
}

// --- Anti-duplication eventId (côté décodeur Max) --------------------------
// Même eventId revenu dans RADIO_MIDI_DUP_WINDOW_MS ms = ne pas republier.

export function isDuplicateEventId(
  eventId: string,
  lastEventId: string | null,
  lastSentAt: number | null,
  now: number,
): boolean {
  return (
    eventId === lastEventId &&
    lastSentAt !== null &&
    now - lastSentAt < RADIO_MIDI_DUP_WINDOW_MS
  )
}

// --- Validation interne ----------------------------------------------------

function assertPacketShape(pkt: unknown, requireMessage: boolean): asserts pkt is RadioMidiPacket {
  if (typeof pkt !== 'object' || pkt === null) {
    throw new Error('radio-midi: paquet attendu (objet)')
  }
  const p = pkt as Record<string, unknown>
  if (p.protocol !== RADIO_MIDI_PROTOCOL) {
    throw new Error(`radio-midi: protocol invalide (attendu "${RADIO_MIDI_PROTOCOL}")`)
  }
  if (p.version !== RADIO_MIDI_VERSION) {
    throw new Error(`radio-midi: version non supportée (attendue ${RADIO_MIDI_VERSION})`)
  }
  if (typeof p.eventId !== 'string' || p.eventId.length === 0) {
    throw new Error('radio-midi: eventId requis (string non vide)')
  }
  if (requireMessage && (typeof p.message !== 'object' || p.message === null)) {
    throw new Error('radio-midi: message requis (objet)')
  }
}