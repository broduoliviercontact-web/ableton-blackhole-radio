import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  postBroadcastMessage,
  type BroadcastInput,
  type BroadcastLayout,
  type BroadcastMessage,
  type BroadcastType,
  type BroadcastVisual,
  type HotfxHeightMode,
  type PanelDensity,
  type TickerDirection,
  type VisualEngine,
  type VisualNoteMode,
  type VisualPreset,
  type VisualTransition,
} from '../api/broadcastMessage'
import { SplitFlapPreview } from './splitflap/SplitFlapPreview'
import { DEFAULT_VISUAL, parseColors } from './splitflap/visual'

interface Props {
  performerPassword: string
}

const TYPES: BroadcastType[] = ['track', 'show', 'announcement', 'note']
const PRESETS: VisualPreset[] = ['pirate-industrial', 'airport-classic', 'terminal-amber', 'minimal-black']
const TRANSITIONS: VisualTransition[] = ['flip', 'scramble', 'flip-scramble', 'instant']
const NOTE_MODES: VisualNoteMode[] = ['paged', 'scroll', 'static']
const ENGINES: VisualEngine[] = ['internal', 'hotfx']
const HEIGHT_MODES: HotfxHeightMode[] = ['auto', 'fixed']
const DENSITIES: PanelDensity[] = ['compact', 'normal', 'large']
const DIRECTIONS: TickerDirection[] = ['left', 'right']

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
const ENGINE_LABELS: Record<VisualEngine, string> = {
  internal: 'Internal',
  hotfx: 'HotFX',
}
const HEIGHT_LABELS: Record<HotfxHeightMode, string> = {
  auto: 'Auto (suit le contenu)',
  fixed: 'Fixe (remplit)',
}
const DENSITY_LABELS: Record<PanelDensity, string> = {
  compact: 'Compact',
  normal: 'Normal',
  large: 'Large',
}
const DIRECTION_LABELS: Record<TickerDirection, string> = {
  left: 'Gauche → (défaut)',
  right: '← Droite',
}

// Aides contextuelles : décrivent l'option actuellement choisie. L'éditeur doit
// être compréhensible sans connaître le code.
const TYPE_HELP: Record<BroadcastType, string> = {
  track: 'Morceau avec artiste / album.',
  show: 'Émission ou session radio.',
  announcement: 'Annonce courte.',
  note: 'Texte ou information longue.',
}
const ENGINE_HELP: Record<VisualEngine, string> = {
  internal: 'Moteur maison, plus contrôlable.',
  hotfx: 'Rendu plus réaliste avec demi-clapets.',
}
const TRANSITION_HELP: Record<VisualTransition, string> = {
  flip: 'Lettres qui tournent comme un clapet de gare.',
  scramble: 'Caractères qui défilent avant le texte final.',
  'flip-scramble': 'Mélange scramble puis clapet final.',
  instant: 'Changement sans animation.',
}
const NOTE_MODE_HELP: Record<VisualNoteMode, string> = {
  paged: 'La note est découpée en pages (cycle toutes les 6 s).',
  scroll: 'La note défile dans les cases split-flap comme un bandeau de gare.',
  static: 'La note reste fixe.',
}
const PRESET_HELP: Record<VisualPreset, string> = {
  'pirate-industrial': 'Radio pirate / panneau industriel.',
  'airport-classic': 'Panneau gare / aéroport.',
  'terminal-amber': 'Terminal ambre.',
  'minimal-black': 'Sobre et noir.',
}

const empty: BroadcastInput = { type: 'track', mainTitle: '' }
// Defaults = preset pirate-industrial (bouton « Réinitialiser visuel »).
const DEFAULT_VISUAL_FORM: BroadcastVisual = { ...DEFAULT_VISUAL }

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
  const [previewNonce, setPreviewNonce] = useState(0)

  const set = <K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  const setVis = <K extends keyof BroadcastVisual>(key: K, value: BroadcastVisual[K]) =>
    setVisual((v) => ({ ...v, [key]: value }))
  // Layout (tailles du panneau) : sous-champs de visual.layout.
  const setLayout = (key: keyof BroadcastLayout, value: number | undefined) =>
    setVisual((v) => ({ ...v, layout: { ...v.layout, [key]: value } }))
  const resetLayout = () => setVisual((v) => ({ ...v, layout: undefined }))

  // Champ scale (%) : range + affichage live. ponytail: helper local DRY (5 scales identiques).
  const scaleField = (key: keyof BroadcastLayout, label: string, min: number, max: number) => {
    const val = visual.layout?.[key] ?? 100
    return (
      <label style={labelStyle}>
        {label} — {val}%
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={val}
          onChange={(e) => setLayout(key, Number(e.target.value))}
          style={inputStyle}
        />
      </label>
    )
  }

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
      setFeedback('Message publié — visible sur la page publique après quelques secondes.')
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

      {/* 1. Contenu radio */}
      <h3 style={h3Style}>Contenu radio</h3>
      <div style={gridStyle}>
        <label style={fullLabelStyle}>
          Nom de la radio (header public)
          <input
            value={form.brandLabel ?? ''}
            onChange={(e) => set('brandLabel', e.target.value)}
            maxLength={60}
            placeholder="RADIO BLACKHOLE"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Type
          <select value={form.type} onChange={(e) => set('type', e.target.value as BroadcastType)} style={inputStyle}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span style={helpStyle}>{TYPE_HELP[form.type]}</span>
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
          <span style={helpStyle}>
            Requis pour publier. Pour une note seule, mets par exemple : NOTE RADIO ou RADIO BLACKHOLE.
          </span>
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
      </div>

      {/* 2. Visualisation split-flap */}
      <h3 style={h3Style}>Visualisation split-flap</h3>
      <div style={gridStyle}>
        <label style={labelStyle}>
          Moteur split-flap
          <select
            value={visual.splitFlapEngine ?? 'internal'}
            onChange={(e) => setVis('splitFlapEngine', e.target.value as VisualEngine)}
            style={inputStyle}
          >
            {ENGINES.map((en) => (
              <option key={en} value={en}>
                {ENGINE_LABELS[en]}
              </option>
            ))}
          </select>
          <span style={helpStyle}>{ENGINE_HELP[visual.splitFlapEngine ?? 'internal']}</span>
        </label>
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
          <span style={helpStyle}>{PRESET_HELP[visual.preset ?? 'pirate-industrial']}</span>
        </label>
        <label style={labelStyle}>
          Transition (moteur internal)
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
          <span style={helpStyle}>{TRANSITION_HELP[visual.transition ?? 'flip']}</span>
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
          <span style={helpStyle}>{NOTE_MODE_HELP[visual.noteMode ?? 'paged']}</span>
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

      {/* Déroulement de la note — visible seulement en mode Déroulement. */}
      {visual.noteMode === 'scroll' && (
        <>
          <h4 style={h4Style}>Déroulement de la note</h4>
          <div style={gridStyle}>
            <label style={labelStyle}>
              Vitesse de défilement (ms) — {visual.noteScrollSpeedMs ?? 180} ms
              <input
                type="range"
                min={100}
                max={5000}
                step={20}
                value={visual.noteScrollSpeedMs ?? 180}
                onChange={(e) => setVis('noteScrollSpeedMs', Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Pas (caractères/tick) — {visual.noteScrollStep ?? 1}
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={visual.noteScrollStep ?? 1}
                onChange={(e) => setVis('noteScrollStep', Number(e.target.value))}
                style={inputStyle}
              />
            </label>
            <label style={checkLabelStyle}>
              <input
                type="checkbox"
                checked={visual.noteScrollLoop ?? true}
                onChange={(e) => setVis('noteScrollLoop', e.target.checked)}
              />
              Boucle continue (sinon s’arrête en fin de note)
            </label>
          </div>
        </>
      )}

      {/* Bandeau roulant (ticker) — texte + vitesse + sens + séparateur + activation. */}
      <h3 style={h3Style}>Bandeau roulant</h3>
      <div style={gridStyle}>
        <label style={fullLabelStyle}>
          Texte du bandeau
          <input
            value={form.ticker ?? ''}
            onChange={(e) => set('ticker', e.target.value)}
            maxLength={500}
            placeholder="RADIO BLACKHOLE · LIVE FROM PANTIN · NEXT SESSION SOON"
            style={inputStyle}
          />
          <span style={helpStyle}>Ce texte apparaît dans le bandeau roulant en bas de la page publique.</span>
        </label>
        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={visual.tickerEnabled ?? true}
            onChange={(e) => setVis('tickerEnabled', e.target.checked)}
          />
          Activer le bandeau
        </label>
        <label style={labelStyle}>
          Vitesse du bandeau (ms) — {visual.tickerSpeedMs ?? 22000} ms
          <input
            type="range"
            min={5000}
            max={120000}
            step={1000}
            value={visual.tickerSpeedMs ?? 22000}
            onChange={(e) => setVis('tickerSpeedMs', Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Sens du défilement
          <select
            value={visual.tickerDirection ?? 'left'}
            onChange={(e) => setVis('tickerDirection', e.target.value as TickerDirection)}
            style={inputStyle}
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {DIRECTION_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Séparateur (max 12)
          <input
            value={visual.tickerSeparator ?? ' · '}
            onChange={(e) => setVis('tickerSeparator', e.target.value)}
            maxLength={12}
            style={inputStyle}
          />
        </label>
      </div>

      {/* 3. Paramètres avancés (fermé par défaut) */}
      <details style={detailsStyle}>
        <summary style={summaryStyle}>Paramètres avancés (HotFX, hauteur, style industriel)</summary>

        <h4 style={h4Style}>Tailles du panneau</h4>
        <div style={gridStyle}>
          {scaleField('titleScale', 'Titre', 50, 200)}
          {scaleField('secondaryScale', 'Secondaire', 50, 200)}
          {scaleField('noteScale', 'Note', 50, 200)}
          {scaleField('tickerScale', 'Ticker', 50, 200)}
          {scaleField('boardScale', 'Panneau (base)', 70, 130)}
          <label style={labelStyle}>
            Titre — lignes (1–3)
            <input
              type="number"
              min={1}
              max={3}
              value={visual.layout?.titleRows ?? 1}
              onChange={(e) => setLayout('titleRows', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Secondaire — lignes (0 = caché, 1–2)
            <input
              type="number"
              min={0}
              max={2}
              value={visual.layout?.secondaryRows ?? 1}
              onChange={(e) => setLayout('secondaryRows', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        </div>
        <div style={rowStyle}>
          <button type="button" onClick={resetLayout}>
            Réinitialiser tailles
          </button>
        </div>

        <h4 style={h4Style}>HotFX natif</h4>
        <div style={gridStyle}>
          <label style={labelStyle}>
            Duration HotFX (ms/clapet)
            <input
              type="number"
              min={30}
              max={1000}
              value={visual.hotfxDurationMs ?? 200}
              onChange={(e) => setVis('hotfxDurationMs', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Gap grille HotFX (px)
            <input
              type="number"
              min={0}
              max={12}
              value={visual.hotfxGridGapPx ?? 3}
              onChange={(e) => setVis('hotfxGridGapPx', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={fullLabelStyle}>
            Alphabet HotFX (max 120 ; espace initial significatif)
            <input
              value={visual.hotfxCharacters ?? ''}
              onChange={(e) => setVis('hotfxCharacters', e.target.value)}
              maxLength={120}
              style={inputStyle}
            />
            <span style={helpStyle}>
              Pour afficher les accents avec HotFX, les caractères doivent être présents dans
              l'alphabet HotFX (les accents français courants sont inclus par défaut).
            </span>
          </label>
        </div>

        <h4 style={h4Style}>Hauteur des zones (HotFX)</h4>
        <div style={gridStyle}>
          <label style={labelStyle}>
            Mode hauteur
            <select
              value={visual.hotfxHeightMode ?? 'auto'}
              onChange={(e) => setVis('hotfxHeightMode', e.target.value as HotfxHeightMode)}
              style={inputStyle}
            >
              {HEIGHT_MODES.map((m) => (
                <option key={m} value={m}>
                  {HEIGHT_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Note lignes min (1–8)
            <input
              type="number"
              min={1}
              max={8}
              value={visual.noteRowsMin ?? 2}
              onChange={(e) => setVis('noteRowsMin', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Note lignes max (1–12)
            <input
              type="number"
              min={1}
              max={12}
              value={visual.noteRowsMax ?? 5}
              onChange={(e) => setVis('noteRowsMax', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        </div>

        <h4 style={h4Style}>Style industriel</h4>
        <div style={gridStyle}>
          <label style={checkLabelStyle}>
            <input
              type="checkbox"
              checked={visual.flicker ?? false}
              onChange={(e) => setVis('flicker', e.target.checked)}
            />
            Flicker
          </label>
          <label style={labelStyle}>
            Flicker intensity (0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={visual.flickerIntensity ?? 35}
              onChange={(e) => setVis('flickerIntensity', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={checkLabelStyle}>
            <input
              type="checkbox"
              checked={visual.edgeGlow ?? true}
              onChange={(e) => setVis('edgeGlow', e.target.checked)}
            />
            Edge glow
          </label>
          <label style={labelStyle}>
            Edge glow intensity (0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={visual.edgeGlowIntensity ?? 45}
              onChange={(e) => setVis('edgeGlowIntensity', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Tile contrast (0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={visual.tileContrast ?? 40}
              onChange={(e) => setVis('tileContrast', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={checkLabelStyle}>
            <input
              type="checkbox"
              checked={visual.panelNoise ?? false}
              onChange={(e) => setVis('panelNoise', e.target.checked)}
            />
            Panel noise
          </label>
          <label style={labelStyle}>
            Panel density
            <select
              value={visual.panelDensity ?? 'normal'}
              onChange={(e) => setVis('panelDensity', e.target.value as PanelDensity)}
              style={inputStyle}
            >
              {DENSITIES.map((d) => (
                <option key={d} value={d}>
                  {DENSITY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Tile radius (0–8)
            <input
              type="number"
              min={0}
              max={8}
              value={visual.tileRadius ?? 3}
              onChange={(e) => setVis('tileRadius', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Tile border width (1–4)
            <input
              type="number"
              min={1}
              max={4}
              value={visual.tileBorderWidth ?? 1}
              onChange={(e) => setVis('tileBorderWidth', e.target.value === '' ? undefined : Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        </div>
      </details>

      {/* Actions */}
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
      {status === 'ok' && (
        <p style={publicLinkStyle}>
          <a href="/" target="_blank" rel="noopener noreferrer">
            Ouvrir la page publique ↗
          </a>
        </p>
      )}

      {/* 4. Preview */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ ...mutedStyle, margin: 0 }}>Aperçu public (rendu split-flap) :</p>
          <button type="button" onClick={() => setPreviewNonce((n) => n + 1)} style={smallBtnStyle}>
            ↻ Relancer preview
          </button>
        </div>
        <SplitFlapPreview key={previewNonce} message={previewMessage} />
        <p style={mutedStyle}>
          Preview non publiée — publier le message pour envoyer aux auditeurs.
        </p>
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
const h4Style: CSSProperties = { fontSize: 13, margin: '10px 0 4px', color: '#374151' }
const mutedStyle: CSSProperties = { color: '#6b7280', fontSize: 14, margin: '0 0 8px' }
const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  marginBottom: 8,
}
const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }
const fullLabelStyle: CSSProperties = { ...labelStyle, gridColumn: '1 / -1' }
const checkLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
}
const inputStyle: CSSProperties = { padding: '6px 8px', fontSize: 14, fontWeight: 400 }
const textareaStyle: CSSProperties = { ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }
const helpStyle: CSSProperties = { color: '#6b7280', fontSize: 12, fontWeight: 400, marginTop: 4 }
const rowStyle: CSSProperties = { display: 'flex', gap: 8, marginTop: 8 }
const okStyle: CSSProperties = { color: 'green', marginTop: 8 }
const errorStyle: CSSProperties = { color: 'crimson', marginTop: 8 }
const publicLinkStyle: CSSProperties = { textAlign: 'center', marginTop: 8 }
const detailsStyle: CSSProperties = { marginTop: 8, marginBottom: 8, borderTop: '1px solid #e5e7eb', padding: '8px 0' }
const summaryStyle: CSSProperties = { cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }
const smallBtnStyle: CSSProperties = { padding: '4px 8px', fontSize: 12, cursor: 'pointer' }