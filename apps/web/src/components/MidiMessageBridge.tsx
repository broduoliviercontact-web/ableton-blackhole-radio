import { useState } from 'react'
import type { BroadcastInput } from '../api/broadcastMessage'
import {
  createRadioMidiPacket,
  encodePacketToMidiNotes,
  RADIO_MIDI_CHANNEL,
  RADIO_MIDI_MAX_BASE64_LENGTH,
} from '../lib/radioMidiMessageProtocol'
import { buildRadioMidiFile, radioMidiClipDurationMs } from '../lib/midiFileWriter'

interface Props {
  /** Message courant préparé dans RadioMessageForm (form + visualFull). */
  message: BroadcastInput
}

type Preview = { notes: number; base64: number; durationMs: number }

/**
 * Panneau « MIDI Message Bridge » : génère un clip MIDI « data » (canal 16)
 * encodant le message radio courant. Parallèle à la publication manuelle —
 * n'oblige pas à republier au site pour générer le .mid. Voir
 * apps/docs/radio-midi-message-bridge.md et tools/max/radio-midi-message-bridge/.
 */
export function MidiMessageBridge({ message }: Props) {
  const [eventId, setEventId] = useState('track-001-intro')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  function buildNotes(): number[] | null {
    setError(null)
    try {
      const id = eventId.trim()
      if (!id) throw new Error('eventId requis')
      const pkt = createRadioMidiPacket(id, message)
      return encodePacketToMidiNotes(pkt)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    }
  }

  function onGenerate() {
    const notes = buildNotes()
    if (!notes) {
      setPreview(null)
      return
    }
    setPreview({
      notes: notes.length,
      base64: notes.length - 2, // moins START + END
      durationMs: radioMidiClipDurationMs(notes.length),
    })
  }

  function onDownload() {
    const notes = buildNotes()
    if (!notes) return
    const bytes = buildRadioMidiFile(notes)
    // ponytail: cast BlobPart — la lib DOM TS7 typage générique Uint8Array<ArrayBufferLike>
    // vs BlobPart attendu. bytes est un ArrayBuffer normal (construit localement).
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'audio/midi' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `radio-midi-${eventId.trim() || 'message'}.mid`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <p className="rf-muted">
        Génère un clip MIDI « data » (canal {RADIO_MIDI_CHANNEL}) encodant le message courant.
        Route ce fichier MIDI vers le patch Max sur le canal {RADIO_MIDI_CHANNEL}. Protocole v1,
        limite {RADIO_MIDI_MAX_BASE64_LENGTH} caractères Base64. Voir la doc protocole.
      </p>
      <label className="rf-label" htmlFor="midi-event-id">
        eventId
      </label>
      <input
        id="midi-event-id"
        className="rf-input"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        placeholder="track-001-intro"
      />
      <div className="rf-row">
        <button type="button" onClick={onGenerate} className="cr-btn--primary">
          Générer fichier MIDI data
        </button>
        <button type="button" onClick={onDownload} className="cr-btn--ghost">
          Télécharger .mid
        </button>
      </div>
      {preview && (
        <ul className="cr-config-list">
          <li>Notes : {preview.notes} (START + payload + END)</li>
          <li>Base64 : {preview.base64} caractères</li>
          <li>Canal MIDI : {RADIO_MIDI_CHANNEL}</li>
          <li>Durée approx. : {preview.durationMs} ms (grille 1/32, 120 BPM)</li>
        </ul>
      )}
      {error && <p className="cr-config-error">❌ {error}</p>}
    </div>
  )
}