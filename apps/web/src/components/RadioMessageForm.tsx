import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  postBroadcastMessage,
  type BroadcastInput,
  type BroadcastMessage,
  type BroadcastType,
  type BroadcastVisual,
  type DisplayMode,
  type VisualNoteMode,
  type VisualPreset,
  type VisualTransition,
} from '../api/broadcastMessage'
import { SplitFlapPreview } from './splitflap/SplitFlapPreview'
import { parseColors } from './splitflap/visual'

interface Props {
  performerPassword: string
}

const TYPES: BroadcastType[] = ['track', 'show', 'announcement', 'note']
const MODES: DisplayMode[] = ['static', 'paged', 'scroll']
const PRESETS: VisualPreset[] = ['pirate-industrial', 'airport-classic', 'terminal-amber', 'minimal-black']
const TRANSITIONS: VisualTransition[] = ['flip', 'scramble', 'flip-scramble', 'instant']
const NOTE_MODES: VisualNoteMode[] = ['paged', 'scroll', 'static']

const PRESET_LABELS: Record<VisualPreset, string> = {
  'pirate-industrial': 'Pirate industrial',
  'airport-classic': 'Airport classic',
  'terminal-amber': 'Terminal amber',
  'minimal-black': 'Minimal black',
}
const TRANSITION_LABELS: Record<VisualTransition, string> = {
  flip: 'Flip mécanique',
  scramble: 'Scramble',
  'flip-scramble': 'Flip + scramble',
  instant: 'Instant',
}
const NOTE_MODE_LABELS: Record<VisualNoteMode, string> = {
  paged: 'Paginé',
  scroll: 'Déroulement',
  static: 'Statique',
}

const empty: BroadcastInput = { type: 'track', mainTitle: '' }
// Defaults = preset pirate-industrial (bouton « Réinitialiser visuel »).
const DEFAULT_VISUAL_FORM: BroadcastVisual = {
  preset: 'pirate-industrial',
  transition: 'flip',
  noteMode: 'paged',
  scrambleDurationMs: 600,
  staggerDelayMs: 12,
  pageDurationMs: 6000,
}

/**
 * Section « Radio Message » : publie le message + réglages visuels split-flap
 * affichés sur la page publique. Indépendant du broadcast audio (publiable
 * même sans live). Utilise le performerPassword validé par PerformerGate
 * (jamais persisté ici). La validation finale reste côté serveur.
 */
export function RadioMessageForm({ performerPassword }: Props) {
  const [form, setForm] = useState<BroadcastInput>(empty)
  const [visual, setVisual] = useState<BroadcastVisual>(DEFAULT_VISUAL_FORM)
  const [scrambleColorsText, setScrambleColorsText] = useState('')
  const [accentColorsText, setAccentColorsText] = useState('')
  const [status, setStatus] = useState<'idle' | 'publishing' | 'ok' | 'error'>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [published, setPublished] = useState<BroadcastMessage | null>(null)

  const set = <K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  const setVis = <K extends keyof BroadcastVisual>(key: K, value: BroadcastVisual[K]) =>
    setVisual((v) => ({ ...v, [key]: value }))

  // visual complet pour preview + submit (couleurs parsées depuis les inputs texte).
  const visualFull: BroadcastVisual = {
    ...visual,
    scrambleColors: parseColors(scrambleColorsText),
    accentColors: parseColors(accentColorsText),
  }
  const previewMessage: BroadcastInput = { ...form, visual: visualFull }

  async function publish() {
    if (!form.mainTitle.trim() || status === 'publishing') return
    setStatus('publishing')
    setFeedback(null)
    try {
      const msg = await postBroadcastMessage(performerPassword, { ...form, visual: visualFull })
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
    setVisual(DEFAULT_VISUAL_FORM)
    setScrambleColorsText('')
    setAccentColorsText('')
    setStatus('idle')
    setFeedback(null)
    setPublished(null)
  }

  function resetVisual() {
    setVisual(DEFAULT_VISUAL_FORM)
    setScrambleColorsText('')
    setAccentColorsText('')
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

      <h3 style={h3Style}>Visualisation split-flap</h3>
      <div style={gridStyle}>
        <label style={labelStyle}>
          Preset visuel
          <select
            value={visual.preset ?? 'pirate-industrial'}
            onChange={(e) => setVis('preset', e.target.value as VisualPreset)}
            style={inputStyle}
          >
            {PRESETS.map((p) => (
              <option key={p} value={p}>
                {PRESET_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Transition
          <select
            value={visual.transition ?? 'flip'}
            onChange={(e) => setVis('transition', e.target.value as VisualTransition)}
            style={inputStyle}
          >
            {TRANSITIONS.map((t) => (
              <option key={t} value={t}>
                {TRANSITION_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Mode de note
          <select
            value={visual.noteMode ?? 'paged'}
            onChange={(e) => setVis('noteMode', e.target.value as VisualNoteMode)}
            style={inputStyle}
          >
            {NOTE_MODES.map((m) => (
              <option key={m} value={m}>
                {NOTE_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Scramble duration (ms)
          <input
            type="number"
            min={100}
            max={3000}
            value={visual.scrambleDurationMs ?? 600}
            onChange={(e) => setVis('scrambleDurationMs', e.target.value === '' ? undefined : Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Stagger delay (ms)
          <input
            type="number"
            min={0}
            max={200}
            value={visual.staggerDelayMs ?? 12}
            onChange={(e) => setVis('staggerDelayMs', e.target.value === '' ? undefined : Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Page duration (ms)
          <input
            type="number"
            min={2000}
            max={30000}
            value={visual.pageDurationMs ?? 6000}
            onChange={(e) => setVis('pageDurationMs', e.target.value === '' ? undefined : Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={fullLabelStyle}>
          Scramble colors (hex séparés par virgule)
          <input
            value={scrambleColorsText}
            onChange={(e) => setScrambleColorsText(e.target.value)}
            placeholder="#e6c84f,#f2ead2,#d94b45"
            style={inputStyle}
          />
        </label>
        <label style={fullLabelStyle}>
          Accent colors (hex séparés par virgule)
          <input
            value={accentColorsText}
            onChange={(e) => setAccentColorsText(e.target.value)}
            placeholder="#f5d76b"
            style={inputStyle}
          />
        </label>
      </div>
      <div style={rowStyle}>
        <button type="button" onClick={resetVisual}>
          Réinitialiser visuel
        </button>
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
        <p style={mutedStyle}>Aperçu public (rendu split-flap) :</p>
        <SplitFlapPreview message={previewMessage} />
        {published && (
          <p style={mutedStyle}>Dernier message publié · updatedAt : {published.updatedAt}</p>
        )}
      </div>
    </section>
  )
}

const sectionStyle: CSSProperties = { borderTop: '1px solid #e5e7eb', marginTop: 16, paddingTop: 16 }
const h2Style: CSSProperties = { fontSize: 18, margin: '0 0 8px' }
const h3Style: CSSProperties = { fontSize: 15, margin: '12px 0 6px' }
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