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
  type TextAlign,
  type VisualEngine,
  type VisualNoteMode,
  type VisualPreset,
  type VisualTransition,
} from '../api/broadcastMessage'
import { SplitFlapPreview } from './splitflap/SplitFlapPreview'
import { DEFAULT_VISUAL, parseColors } from './splitflap/visual'
import { HelpTooltip } from './HelpTooltip'
import { cr } from './controlRoom'

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

// Textes des tooltips d'aide (accessibles au hover/focus/clic). Remplacent les
// anciennes aides inline pour éviter les doublons et les longs paragraphes.
const TIPS = {
  brandLabel:
    "Nom affiché dans le header de la page publique. Exemple : RADIO BLACKHOLE, ZUB RADIO, BLACKHOLE FM.",
  type:
    "Catégorie du message : track = morceau, show = émission, announcement = annonce courte, note = texte explicatif.",
  noteMode:
    "Contrôle la note longue : statique = fixe, paginé = pages successives, déroulement = texte qui avance dans les cases split-flap.",
  mainTitle:
    "Champ requis. C’est le grand texte principal du panneau. Pour une note seule, utilise par exemple RADIO BLACKHOLE ou NOTE RADIO.",
  subtitle: "Texte secondaire sous le titre : épisode, contexte, lieu, numéro de session, etc.",
  artist: "Nom de l’artiste, du performer ou du projet musical.",
  album: "Album, collection, session ou série associée au message.",
  url: "Lien optionnel associé au message. Utilise seulement des liens http/https.",
  note:
    "Texte explicatif affiché dans la grande zone du panneau. Peut être paginé ou déroulant selon le mode de note.",
  engine:
    "Internal = moteur maison très contrôlable. HotFX = rendu plus réaliste avec demi-clapets mécaniques.",
  preset: "Change l’ambiance du panneau : radio pirate, gare/aéroport, terminal ambre ou minimal noir.",
  transition: "Animation des lettres : flip mécanique, scramble, mélange des deux, ou instantané.",
  staggerDelay:
    "Décalage entre les tuiles. Plus la valeur est haute, plus la vague d’animation gauche→droite est visible.",
  pageDuration: "Durée d’affichage d’une page de note avant de passer à la suivante.",
  scrambleColors:
    "Couleurs utilisées pendant le mode scramble. Format hex séparé par virgule, ex : #e6c84f,#d94b45.",
  accentColors:
    "Couleurs principales du panneau : titre, ticker, accents lumineux. Format hex séparé par virgule.",
  tickerText: "Texte qui défile en bas de la page publique, comme un bandeau radio/news.",
  tickerEnabled: "Masque ou affiche le ticker en bas du panneau public.",
  tickerSpeed:
    "Durée d’un cycle de défilement. Plus la valeur est élevée, plus le bandeau défile lentement.",
  tickerDirection: "Direction du bandeau : gauche ou droite.",
  tickerSeparator: "Texte placé entre deux répétitions du ticker. Exemple : · ou // ou —.",
  noteScrollSpeed:
    "Vitesse du défilement dans les cases split-flap. Plus la valeur est basse, plus le texte avance vite.",
  noteScrollStep:
    "Nombre de caractères avancés à chaque pas. 1 = très fluide, valeurs plus hautes = saut plus rapide.",
  noteScrollLoop: "Quand activé, le texte recommence au début après la fin.",
  hotfxDuration:
    "Durée par chute de clapet. Attention : ce n’est pas la durée totale, car HotFX avance caractère par caractère dans son alphabet.",
  hotfxCharacters:
    "Liste des caractères disponibles pour HotFX. Les caractères absents peuvent disparaître. Les accents français sont inclus par défaut.",
  hotfxGridGap: "Espace entre les clapets HotFX.",
  hotfxHeightMode:
    "Auto adapte la hauteur au texte. Fixe garde une hauteur plus stable pour la zone note.",
  noteRows: "Nombre minimum et maximum de lignes utilisées par la note HotFX.",
  flicker: "Ajoute un léger scintillement radio/électrique au panneau.",
  flickerIntensity: "Force du scintillement. À utiliser doucement pour rester lisible.",
  edgeGlow: "Ajoute une lueur sur les bords du panneau et des tuiles.",
  edgeGlowIntensity: "Intensité de la lueur.",
  tileContrast: "Contraste des clapets. Plus haut = tuiles plus marquées.",
  panelNoise: "Ajoute une texture discrète au panneau pour un aspect plus industriel.",
  panelDensity: "Densité des tuiles : compact = plus serré, large = plus aéré.",
  tileRadius: "Arrondi des tuiles. Bas = plus industriel, haut = plus doux.",
  tileBorderWidth: "Épaisseur de bordure des tuiles.",
  boardScale: "Taille générale du panneau.",
  titleScale: "Taille du titre principal.",
  secondaryScale: "Taille de la ligne secondaire.",
  noteScale: "Taille du texte dans la zone note.",
  tickerScale: "Taille du bandeau roulant.",
  titleRows: "Nombre de lignes réservées au titre principal.",
  secondaryRows: "Nombre de lignes réservées à la ligne secondaire. 0 masque cette zone.",
  boardColumns:
    "Nombre de clapets/cases sur chaque ligne du panneau. Plus il y en a, plus le texte peut être long, mais les cases deviennent plus petites ou le panneau plus dense.",
  brandAlign: "Alignement du nom de radio dans le haut de la page publique.",
  titleAlign: "Alignement du grand titre dans les cases split-flap.",
  secondaryAlign: "Alignement de la ligne sous le titre.",
  noteAlign: "Alignement de la zone note.",
} as const

const ALIGNS: TextAlign[] = ['left', 'center', 'right']
const ALIGN_LABELS: Record<TextAlign, string> = { left: 'Gauche', center: 'Centre', right: 'Droite' }

// En-tête de champ : label + tooltip d'aide. Évite les longs paragraphes visibles
// tout en restant accessible (hover/focus/clic). ponytail: helper DRY pour ~40 champs.
function FieldHead({ text, tip }: { text: string; tip: string }) {
  return (
    <span style={headStyle}>
      {text} <HelpTooltip text={tip} label={text} />
    </span>
  )
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
  // Layout (tailles du panneau + alignements) : sous-champs de visual.layout.
  // ponytail: value accepte number (scales/rows) et string (aligns) en un seul setter.
  const setLayout = (key: keyof BroadcastLayout, value: number | string | undefined) =>
    setVisual((v) => ({ ...v, layout: { ...v.layout, [key]: value } }))
  const resetLayout = () => setVisual((v) => ({ ...v, layout: undefined }))

  // Champ scale (%) : range + affichage live + tooltip. ponytail: helper local DRY (5 scales identiques).
  const scaleField = (key: keyof BroadcastLayout, label: string, min: number, max: number, tip: string) => {
    const val = visual.layout?.[key] ?? 100
    return (
      <label style={labelStyle}>
        <FieldHead text={`${label} — ${val}%`} tip={tip} />
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

  // Segmented control Gauche/Centre/Droite. ponytail: 3 boutons — pas de lib UI.
  const alignControl = (key: keyof BroadcastLayout, label: string, tip: string) => {
    const val = (visual.layout?.[key] as TextAlign | undefined) ?? 'left'
    return (
      <label style={labelStyle}>
        <FieldHead text={label} tip={tip} />
        <div role="group" style={segGroupStyle}>
          {ALIGNS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setLayout(key, a)}
              aria-pressed={val === a}
              style={val === a ? segBtnActiveStyle : segBtnStyle}
            >
              {ALIGN_LABELS[a]}
            </button>
          ))}
        </div>
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
      <h2 style={h2Style}>Message radio &amp; affichage</h2>
      <p style={mutedStyle}>
        Pilote le message affiché sur la page publique <code>/</code>. Indépendant du
        broadcast audio — publiable même sans live. La page publique recharge le message
        publié après quelques secondes.
      </p>

      {/* ponytail: aperçu séparé des contrôles (panneau sticky). RadioMessageForm
          reste la source unique de l'état — on ne fait que déplacer le JSX du
          bloc ⑥ en tête de layout. Aperçu = écran principal, contrôles sur le côté. */}
      <div className="rf-layout">
        <div className="rf-preview">
          <h3 style={h3Style}>Aperçu public</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <p style={{ ...mutedStyle, margin: 0, fontSize: 11 }}>Rendu split-flap · moteur = message.visual.splitFlapEngine</p>
            <button type="button" onClick={() => setPreviewNonce((n) => n + 1)} style={smallBtnStyle}>
              ↻ Relancer
            </button>
          </div>
          <SplitFlapPreview key={previewNonce} message={previewMessage} />
          <p style={mutedStyle}>Aperçu non publié — publier le message pour l’envoyer aux auditeurs.</p>
          {published && (
            <p style={mutedStyle}>Dernier message publié · updatedAt : {published.updatedAt}</p>
          )}
        </div>

        <div className="rf-controls">
      {/* Bloc A — Publication : statut + actions + lien public (en haut pour publier vite). */}
      <h3 style={h3Style}>① Publication</h3>
      <div style={pubRowStyle}>
        <span style={status === 'ok' ? pubOkStyle : status === 'error' ? pubErrStyle : pubIdleStyle}>
          {status === 'publishing' ? 'Publication…' : status === 'ok' ? 'Publié' : status === 'error' ? 'Erreur' : 'Brouillon'}
        </span>
        <button type="button" onClick={publish} disabled={!form.mainTitle.trim() || status === 'publishing'} style={publishBtnStyle}>
          {status === 'publishing' ? 'Publication…' : 'Publier le message'}
        </button>
        <button type="button" onClick={reset}>Réinitialiser</button>
        <a href="/" target="_blank" rel="noopener noreferrer" style={pubLinkStyle}>
          Ouvrir la page publique ↗
        </a>
      </div>
      {feedback && (
        <p style={status === 'error' ? errorStyle : okStyle}>{status === 'error' ? `❌ ${feedback}` : `✅ ${feedback}`}</p>
      )}

      {/* Bloc B — Contenu radio */}
      <h3 style={h3Style}>② Contenu radio</h3>
      <div style={gridStyle}>
        <label style={fullLabelStyle}>
          <FieldHead text="Nom de la radio (header public)" tip={TIPS.brandLabel} />
          <input
            value={form.brandLabel ?? ''}
            onChange={(e) => set('brandLabel', e.target.value)}
            maxLength={60}
            placeholder="RADIO BLACKHOLE"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <FieldHead text="Type" tip={TIPS.type} />
          <select value={form.type} onChange={(e) => set('type', e.target.value as BroadcastType)} style={inputStyle}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={fullLabelStyle}>
          <FieldHead text="Titre principal *" tip={TIPS.mainTitle} />
          <input
            value={form.mainTitle}
            onChange={(e) => set('mainTitle', e.target.value)}
            maxLength={120}
            placeholder="Ex : Late Night Tape"
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <FieldHead text="Sous-titre" tip={TIPS.subtitle} />
          <input
            value={form.subtitle ?? ''}
            onChange={(e) => set('subtitle', e.target.value)}
            maxLength={160}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <FieldHead text="Artiste" tip={TIPS.artist} />
          <input value={form.artist ?? ''} onChange={(e) => set('artist', e.target.value)} maxLength={120} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          <FieldHead text="Album" tip={TIPS.album} />
          <input value={form.album ?? ''} onChange={(e) => set('album', e.target.value)} maxLength={120} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          <FieldHead text="URL" tip={TIPS.url} />
          <input
            value={form.url ?? ''}
            onChange={(e) => set('url', e.target.value)}
            maxLength={500}
            placeholder="https://…"
            style={inputStyle}
          />
        </label>
        <label style={fullLabelStyle}>
          <FieldHead text="Note longue" tip={TIPS.note} />
          <textarea
            value={form.note ?? ''}
            onChange={(e) => set('note', e.target.value)}
            maxLength={2000}
            rows={3}
            style={textareaStyle}
          />
        </label>
      </div>

      {/* Bloc C — Affichage public : moteur, preset, transition, mode note, alignements, tailles. */}
      <h3 style={h3Style}>③ Affichage public</h3>
      <div style={gridStyle}>
        <label style={labelStyle}>
          <FieldHead text="Moteur split-flap" tip={TIPS.engine} />
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
        </label>
        <label style={labelStyle}>
          <FieldHead text="Preset visuel" tip={TIPS.preset} />
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
          <FieldHead text="Transition (moteur internal)" tip={TIPS.transition} />
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
          <FieldHead text="Mode de note" tip={TIPS.noteMode} />
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
          <FieldHead text="Page duration (ms)" tip={TIPS.pageDuration} />
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
          <FieldHead text="Stagger delay (ms)" tip={TIPS.staggerDelay} />
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
          <FieldHead text="Scramble colors (hex séparés par virgule)" tip={TIPS.scrambleColors} />
          <input
            value={scrambleColorsText}
            onChange={(e) => setScrambleColorsText(e.target.value)}
            placeholder="#e6c84f,#f2ead2,#d94b45"
            style={inputStyle}
          />
        </label>
        <label style={fullLabelStyle}>
          <FieldHead text="Accent colors (hex séparés par virgule)" tip={TIPS.accentColors} />
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

      {/* Alignement des textes — padding grille (titre/secondaire/note) + CSS (header). */}
      <h4 style={h4Style}>Alignement des textes</h4>
      <div style={gridStyle}>
        {alignControl('brandAlign', 'Header', TIPS.brandAlign)}
        {alignControl('titleAlign', 'Titre', TIPS.titleAlign)}
        {alignControl('secondaryAlign', 'Secondaire', TIPS.secondaryAlign)}
        {alignControl('noteAlign', 'Note', TIPS.noteAlign)}
      </div>

      {/* Tailles du panneau — scales % + lignes (déplacé ici depuis les détails avancés). */}
      <h4 style={h4Style}>Tailles du panneau</h4>
      <div style={gridStyle}>
        {scaleField('titleScale', 'Titre', 50, 200, TIPS.titleScale)}
        {scaleField('secondaryScale', 'Secondaire', 50, 200, TIPS.secondaryScale)}
        {scaleField('noteScale', 'Note', 50, 200, TIPS.noteScale)}
        {scaleField('tickerScale', 'Ticker', 50, 200, TIPS.tickerScale)}
        {scaleField('boardScale', 'Panneau (base)', 70, 130, TIPS.boardScale)}
        <label style={labelStyle}>
          <FieldHead text="Nombre de cases par ligne (12–64)" tip={TIPS.boardColumns} />
          <input
            type="number"
            min={12}
            max={64}
            value={visual.layout?.boardColumns ?? 32}
            onChange={(e) => setLayout('boardColumns', e.target.value === '' ? undefined : Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          <FieldHead text="Titre — lignes (1–3)" tip={TIPS.titleRows} />
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
          <FieldHead text="Secondaire — lignes (0 = caché, 1–2)" tip={TIPS.secondaryRows} />
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

      {/* Déroulement de la note — visible seulement en mode Déroulement. */}
      {visual.noteMode === 'scroll' && (
        <>
          <h4 style={h4Style}>Déroulement de la note</h4>
          <div style={gridStyle}>
            <label style={labelStyle}>
              <FieldHead text={`Vitesse de défilement (ms) — ${visual.noteScrollSpeedMs ?? 180} ms`} tip={TIPS.noteScrollSpeed} />
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
              <FieldHead text={`Pas (caractères/tick) — ${visual.noteScrollStep ?? 1}`} tip={TIPS.noteScrollStep} />
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
              <HelpTooltip text={TIPS.noteScrollLoop} label="Boucle continue" />
            </label>
          </div>
        </>
      )}

      {/* Bloc D — Bandeau roulant (ticker) : texte + vitesse + sens + séparateur + activation. */}
      <h3 style={h3Style}>④ Bandeau roulant</h3>
      <div style={gridStyle}>
        <label style={fullLabelStyle}>
          <FieldHead text="Texte du bandeau" tip={TIPS.tickerText} />
          <input
            value={form.ticker ?? ''}
            onChange={(e) => set('ticker', e.target.value)}
            maxLength={500}
            placeholder="RADIO BLACKHOLE · LIVE FROM PANTIN · NEXT SESSION SOON"
            style={inputStyle}
          />
        </label>
        <label style={checkLabelStyle}>
          <input
            type="checkbox"
            checked={visual.tickerEnabled ?? true}
            onChange={(e) => setVis('tickerEnabled', e.target.checked)}
          />
          Activer le bandeau
          <HelpTooltip text={TIPS.tickerEnabled} label="Activer le bandeau" />
        </label>
        <label style={labelStyle}>
          <FieldHead text={`Vitesse du bandeau (ms) — ${visual.tickerSpeedMs ?? 22000} ms`} tip={TIPS.tickerSpeed} />
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
          <FieldHead text="Sens du défilement" tip={TIPS.tickerDirection} />
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
          <FieldHead text="Séparateur (max 12)" tip={TIPS.tickerSeparator} />
          <input
            value={visual.tickerSeparator ?? ' · '}
            onChange={(e) => setVis('tickerSeparator', e.target.value)}
            maxLength={12}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Bloc E — Détails avancés (HotFX, hauteur, style industriel) — fermé par défaut. */}
      <details style={detailsStyle}>
        <summary style={summaryStyle}>⑤ Détails avancés (HotFX, hauteur, style industriel)</summary>

        <h4 style={h4Style}>HotFX natif</h4>
        <div style={gridStyle}>
          <label style={labelStyle}>
            <FieldHead text="Duration HotFX (ms/clapet)" tip={TIPS.hotfxDuration} />
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
            <FieldHead text="Gap grille HotFX (px)" tip={TIPS.hotfxGridGap} />
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
            <FieldHead text="Alphabet HotFX (max 120 ; espace initial significatif)" tip={TIPS.hotfxCharacters} />
            <input
              value={visual.hotfxCharacters ?? ''}
              onChange={(e) => setVis('hotfxCharacters', e.target.value)}
              maxLength={120}
              style={inputStyle}
            />
          </label>
        </div>

        <h4 style={h4Style}>Hauteur des zones (HotFX)</h4>
        <div style={gridStyle}>
          <label style={labelStyle}>
            <FieldHead text="Mode hauteur" tip={TIPS.hotfxHeightMode} />
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
            <FieldHead text="Note lignes min (1–8)" tip={TIPS.noteRows} />
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
            <FieldHead text="Note lignes max (1–12)" tip={TIPS.noteRows} />
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
            <HelpTooltip text={TIPS.flicker} label="Flicker" />
          </label>
          <label style={labelStyle}>
            <FieldHead text="Flicker intensity (0–100)" tip={TIPS.flickerIntensity} />
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
            <HelpTooltip text={TIPS.edgeGlow} label="Edge glow" />
          </label>
          <label style={labelStyle}>
            <FieldHead text="Edge glow intensity (0–100)" tip={TIPS.edgeGlowIntensity} />
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
            <FieldHead text="Tile contrast (0–100)" tip={TIPS.tileContrast} />
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
            <HelpTooltip text={TIPS.panelNoise} label="Panel noise" />
          </label>
          <label style={labelStyle}>
            <FieldHead text="Panel density" tip={TIPS.panelDensity} />
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
            <FieldHead text="Tile radius (0–8)" tip={TIPS.tileRadius} />
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
            <FieldHead text="Tile border width (1–4)" tip={TIPS.tileBorderWidth} />
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
        </div>
      </div>
    </section>
  )
}

const sectionStyle: CSSProperties = { background: cr.surface, border: `1px solid ${cr.border}`, borderRadius: 8, padding: 18, marginTop: 0 }
const h2Style: CSSProperties = { margin: '0 0 6px', fontFamily: cr.mono, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', color: cr.accent, fontWeight: 600 }
const h3Style: CSSProperties = { fontSize: 11, margin: '14px 0 6px', fontFamily: cr.mono, letterSpacing: 2, textTransform: 'uppercase', color: cr.textMuted, fontWeight: 600 }
const h4Style: CSSProperties = { fontSize: 10, margin: '10px 0 4px', color: cr.textDim, fontFamily: cr.mono, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }
const mutedStyle: CSSProperties = { color: cr.textDim, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }
const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
  marginBottom: 8,
}
const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: cr.textMuted }
const fullLabelStyle: CSSProperties = { ...labelStyle, gridColumn: '1 / -1' }
const checkLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: cr.text,
  textTransform: 'none',
  letterSpacing: 0,
}
const inputStyle: CSSProperties = { padding: '7px 9px', fontSize: 14, fontWeight: 400, fontFamily: cr.mono, color: cr.text, background: cr.surfaceSunken, border: `1px solid ${cr.borderStrong}`, borderRadius: 4 }
const textareaStyle: CSSProperties = { ...inputStyle, fontFamily: cr.mono, resize: 'vertical' }
const headStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6 }
const rowStyle: CSSProperties = { display: 'flex', gap: 8, marginTop: 8 }
const okStyle: CSSProperties = { color: cr.ok, marginTop: 8, fontSize: 13 }
const errorStyle: CSSProperties = { color: cr.err, marginTop: 8, fontSize: 13 }
const detailsStyle: CSSProperties = { marginTop: 10, marginBottom: 8, borderTop: `1px solid ${cr.border}`, padding: '10px 0 0' }
const summaryStyle: CSSProperties = { cursor: 'pointer', fontSize: 11, fontWeight: 600, color: cr.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontFamily: cr.mono }
const smallBtnStyle: CSSProperties = { padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: cr.mono, letterSpacing: 1, textTransform: 'uppercase', color: cr.text, background: cr.surfaceRaised, border: `1px solid ${cr.borderStrong}`, borderRadius: 4 }
const segGroupStyle: CSSProperties = { display: 'inline-flex', gap: 4 }
const segBtnStyle: CSSProperties = { padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${cr.borderStrong}`, background: cr.surfaceRaised, color: cr.textMuted, fontFamily: cr.mono, borderRadius: 4 }
const segBtnActiveStyle: CSSProperties = { ...segBtnStyle, border: `1px solid ${cr.accentDeep}`, background: cr.accent, color: '#0e1117' }
const publishBtnStyle: CSSProperties = { padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase', fontFamily: cr.mono, border: `1px solid ${cr.accentDeep}`, background: cr.accent, color: '#0e1117', borderRadius: 4 }
const pubRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }
const pubLinkStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: cr.accent, textTransform: 'uppercase', letterSpacing: 1, fontFamily: cr.mono, textDecoration: 'none' }
const pubIdleStyle: CSSProperties = { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 3, background: cr.surfaceSunken, color: cr.textMuted, fontFamily: cr.mono, letterSpacing: 1, textTransform: 'uppercase' }
const pubOkStyle: CSSProperties = { ...pubIdleStyle, background: 'rgba(34,197,94,.18)', color: cr.ok }
const pubErrStyle: CSSProperties = { ...pubIdleStyle, background: 'rgba(239,68,68,.18)', color: cr.err }