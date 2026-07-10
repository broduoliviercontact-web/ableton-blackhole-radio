// Writer de fichier MIDI Standard (SMF type 0) minimal — sans dépendance.
// Une piste, canal 16, notes courtes sur une grille 1/32, tempo 120 BPM.
// ponytail: juste assez pour porter les notes radio-midi (START + payload Base64
// + END). Pas d'audio, pas Web MIDI. Voir apps/docs/radio-midi-message-bridge.md.
//
// Canal 16 utilisateur = canal raw 15. note-on = 0x9F, note-off = 0x8F (note-off
// explicite, pas velocity-0, pour que les décodeurs qui ignorent vel-0 reçoivent
// bien la fin).

const TPQN = 480 // ticks par noire (quarter)
const SLOT = TPQN / 8 // 1/32 note = 60 ticks (grille stable)
const NOTE_LEN = 12 // note courte (ticks)
const VELOCITY = 100
const NOTE_OFF_VEL = 64
const CHANNEL_RAW = 15 // canal 16 utilisateur → raw 15
const TEMPO_BPM = 120
const MICROSEC_PER_QUARTER = Math.round(60_000_000 / TEMPO_BPM) // 500000 @ 120 BPM

// Quantité longueur variable MIDI (VLQ).
function vlq(n: number): number[] {
  const out: number[] = []
  let v = n & 0x0fffffff
  out.unshift(v & 0x7f)
  v >>= 7
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80)
    v >>= 7
  }
  return out
}

function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}

// Durée approximative en ms d'un clip de `noteCount` notes (grille 1/32, 120 BPM).
// 1 tick = (60s / BPM) / TPQN = 0.5s / 480 ≈ 1.0417 ms ; slot 1/32 = 60 ticks ≈ 62.5 ms.
export function radioMidiClipDurationMs(noteCount: number): number {
  return Math.round(noteCount * (60_000 / TEMPO_BPM / TPQN) * SLOT)
}

// Construit un SMF type 0 à partir des notes [START, ...payload, END].
export function buildRadioMidiFile(notes: number[]): Uint8Array {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new Error('midi-writer: notes vides')
  }
  const ev: number[] = []
  // Meta tempo (0xFF 0x51 0x03 tt tt tt) à delta 0.
  ev.push(
    0,
    0xff,
    0x51,
    0x03,
    (MICROSEC_PER_QUARTER >>> 16) & 0xff,
    (MICROSEC_PER_QUARTER >>> 8) & 0xff,
    MICROSEC_PER_QUARTER & 0xff,
  )
  notes.forEach((pitch, i) => {
    const onDelta = i === 0 ? 0 : SLOT - NOTE_LEN // atteint le prochain slot 1/32
    ev.push(...vlq(onDelta), 0x90 | CHANNEL_RAW, pitch & 0x7f, VELOCITY)
    ev.push(...vlq(NOTE_LEN), 0x80 | CHANNEL_RAW, pitch & 0x7f, NOTE_OFF_VEL)
  })
  // End of track (delta = un slot pour aérer).
  ev.push(...vlq(SLOT), 0xff, 0x2f, 0x00)

  const header = [
    0x4d, 0x54, 0x68, 0x64, // "MThd"
    0, 0, 0, 6, // longueur header = 6
    0, 0, // format 0
    0, 1, // 1 piste
    (TPQN >>> 8) & 0xff, TPQN & 0xff, // division (TPQN)
    0x4d, 0x54, 0x72, 0x6b, // "MTrk"
    ...u32(ev.length),
  ]
  return new Uint8Array([...header, ...ev])
}