import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  postBroadcastMessage,
  type BroadcastInput,
  type BroadcastMessage,
  type BroadcastType,
  type DisplayMode,
} from '../api/broadcastMessage'
import { BroadcastMessagePanel } from './BroadcastMessagePanel'

interface Props {
  performerPassword: string
}

const TYPES: BroadcastType[] = ['track', 'show', 'announcement', 'note']
const MODES: DisplayMode[] = ['static', 'paged', 'scroll']

const empty: BroadcastInput = { type: 'track', mainTitle: '' }

/**
 * Section « Radio Message » : publie le message affiché sur la page publique.
 * Indépendant du broadcast audio (publiable même sans live). Utilise le
 * performerPassword validé par PerformerGate (jamais persisté ici).
 */
export function RadioMessageForm({ performerPassword }: Props) {
  const [form, setForm] = useState<BroadcastInput>(empty)
  const [status, setStatus] = useState<'idle' | 'publishing' | 'ok' | 'error'>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [published, setPublished] = useState<BroadcastMessage | null>(null)

  const set = <K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const preview = useMemo<BroadcastMessage>(
    () => ({ ...form, updatedAt: published?.updatedAt ?? '' }),
    [form, published],
  )

  async function publish() {
    if (!form.mainTitle.trim() || status === 'publishing') return
    setStatus('publishing')
    setFeedback(null)
    try {
      const msg = await postBroadcastMessage(performerPassword, form)
      setPublished(msg)
      setStatus('ok')
      setFeedback('Message publié.')
    } catch (e) {
      setStatus('error')
      setFeedback(e instanceof Error ? e.message : String(e))
    }
  }

  function reset() {
    setForm(empty)
    setStatus('idle')
    setFeedback(null)
    setPublished(null)
  }

  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Message radio</h2>
      <p style={mutedStyle}>
        Publie le message affiché sur la page publique. Indépendant du broadcast audio —
        publiable même sans live.
      </p>

      <div style={gridStyle}>
        <label style={labelStyle}>
          Type
          <select value={form.type} onChange={(e) => set('type', e.target.value as BroadcastType)} style={inputStyle}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Display mode
          <select
            value={form.displayMode ?? 'static'}
            onChange={(e) => set('displayMode', e.target.value as DisplayMode)}
            style={inputStyle}
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label style={fullLabelStyle}>
          Titre principal *
          <input
            value={form.mainTitle}
            onChange={(e) => set('mainTitle', e.target.value)}
            maxLength={120}
            placeholder="Ex : Late Night Tape"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Sous-titre
          <input
            value={form.subtitle ?? ''}
            onChange={(e) => set('subtitle', e.target.value)}
            maxLength={160}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Artiste
          <input value={form.artist ?? ''} onChange={(e) => set('artist', e.target.value)} maxLength={120} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Album
          <input value={form.album ?? ''} onChange={(e) => set('album', e.target.value)} maxLength={120} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          URL
          <input
            value={form.url ?? ''}
            onChange={(e) => set('url', e.target.value)}
            maxLength={500}
            placeholder="https://…"
            style={inputStyle}
          />
        </label>
        <label style={fullLabelStyle}>
          Note longue
          <textarea
            value={form.note ?? ''}
            onChange={(e) => set('note', e.target.value)}
            maxLength={2000}
            rows={3}
            style={textareaStyle}
          />
        </label>
        <label style={fullLabelStyle}>
          Ticker (bandeau bas)
          <input
            value={form.ticker ?? ''}
            onChange={(e) => set('ticker', e.target.value)}
            maxLength={500}
            style={inputStyle}
          />
        </label>
      </div>

      <div style={rowStyle}>
        <button type="button" onClick={publish} disabled={!form.mainTitle.trim() || status === 'publishing'}>
          {status === 'publishing' ? 'Publication…' : 'Publier le message'}
        </button>
        <button type="button" onClick={reset}>
          Réinitialiser
        </button>
      </div>
      {feedback && (
        <p style={status === 'error' ? errorStyle : okStyle}>{status === 'error' ? `❌ ${feedback}` : `✅ ${feedback}`}</p>
      )}

      <div style={{ marginTop: 16 }}>
        <p style={mutedStyle}>Aperçu (rendu local) :</p>
        <BroadcastMessagePanel message={preview} />
      </div>
    </section>
  )
}

const sectionStyle: CSSProperties = { borderTop: '1px solid #e5e7eb', marginTop: 16, paddingTop: 16 }
const h2Style: CSSProperties = { fontSize: 18, margin: '0 0 8px' }
const mutedStyle: CSSProperties = { color: '#6b7280', fontSize: 14, margin: '0 0 8px' }
const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  marginBottom: 8,
}
const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }
const fullLabelStyle: CSSProperties = { ...labelStyle, gridColumn: '1 / -1' }
const inputStyle: CSSProperties = { padding: '6px 8px', fontSize: 14, fontWeight: 400 }
const textareaStyle: CSSProperties = { ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }
const rowStyle: CSSProperties = { display: 'flex', gap: 8, marginTop: 8 }
const okStyle: CSSProperties = { color: 'green', marginTop: 8 }
const errorStyle: CSSProperties = { color: 'crimson', marginTop: 8 }