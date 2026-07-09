import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SplitFlapDisplay } from './SplitFlapDisplay'
import { RadioTicker } from './RadioTicker'
import {
  formatBroadcastMessage,
  wrapAligned,
  notePagesAligned,
  SPLIT_FLAP_TITLE_COLS,
  SPLIT_FLAP_SECONDARY_COLS,
  SPLIT_FLAP_NOTE_COLS,
  SPLIT_FLAP_NOTE_ROWS,
} from './format'
import { resolveVisual, presetClass, accentColor, styleVars } from './visual'
import { useScrollingTextWindow } from './useScrollingTextWindow'
import { SplitFlapVisualProvider, type SplitFlapVisualSettings } from './SplitFlapContext'
import { HotFxSplitFlap } from '../hotfx/HotFxSplitFlap'
import { hotfxLayout, noteHeightFor } from '../hotfx/layout'
import type { BroadcastInput, BroadcastMessage } from '../../api/broadcastMessage'
// ponytail: styles importés ici (et dans RadioPage) — Vite déduplique. Garantit que
// l'aperçu est stylé dans le chunk performer (qui ne charge pas splitflap.css).
import './splitflap.css'
import '../hotfx/hotfx.css'

interface Props {
  message: BroadcastInput | BroadcastMessage | null
}

/**
 * Aperçu split-flap côté performer : reprend exactement le rendu de la page
 * publique (même moteur = message.visual.splitFlapEngine, mêmes hauteurs/timings/
 * couleurs/style), en plus petit (classe sf-cabinet--preview). Pas d'audio, pas
 * de contrôles. Moteur internal : flip par tuile (char-change) — l'aperçu « vit »
 * pendant la saisie. Moteur HotFX : textContent change → MutationObserver.
 */
export function SplitFlapPreview({ message }: Props) {
  const board = formatBroadcastMessage(message)
  const v = resolveVisual(message?.visual)
  const useHotFx = v.splitFlapEngine === 'hotfx'
  const settings: SplitFlapVisualSettings = {
    transition: v.transition,
    scrambleDurationMs: v.scrambleDurationMs,
    staggerDelayMs: v.staggerDelayMs,
    scrambleColors: v.scrambleColors,
  }

  const hotfx = useHotFx ? hotfxLayout(board, v) : null

  // Mode note : scroll = défilement char-par-char ; paged = cycle ; static = fixe.
  const isScroll = v.noteMode === 'scroll'
  const notePages = isScroll
    ? []
    : hotfx
      ? hotfx.notePages
      : notePagesAligned(board.noteRaw, SPLIT_FLAP_NOTE_COLS, SPLIT_FLAP_NOTE_ROWS, v.layout.noteAlign)
  const [notePage, setNotePage] = useState(0)
  useEffect(() => {
    setNotePage(0)
    if (isScroll || v.noteMode === 'static' || notePages.length <= 1) return
    const t = window.setInterval(() => setNotePage((p) => (p + 1) % notePages.length), v.pageDurationMs)
    return () => clearInterval(t)
  }, [notePages, v.noteMode, v.pageDurationMs, isScroll])

  const scrollRows = hotfx ? v.noteRowsMax : SPLIT_FLAP_NOTE_ROWS
  const scrollLines = useScrollingTextWindow(
    board.noteRaw,
    SPLIT_FLAP_NOTE_COLS,
    scrollRows,
    v.noteScrollSpeedMs,
    v.noteScrollStep,
    v.noteScrollLoop,
    isScroll,
  )
  // Scroll + texte plus court que la zone : on aligne (noteAlign) au lieu de défiler.
  const noteFitsScroll = isScroll && board.noteRaw.length <= scrollRows * SPLIT_FLAP_NOTE_COLS
  const noteScrollDisplay = noteFitsScroll
    ? wrapAligned(board.noteRaw, SPLIT_FLAP_NOTE_COLS, scrollRows, v.layout.noteAlign)
    : scrollLines

  const rawNoteLines = isScroll ? [] : v.noteMode === 'static' ? notePages[0] : notePages[notePage] ?? notePages[0]
  const noteHeight = hotfx ? (isScroll ? scrollRows : noteHeightFor(v, rawNoteLines.length)) : SPLIT_FLAP_NOTE_ROWS
  const titleLines = wrapAligned(board.titleRaw, SPLIT_FLAP_TITLE_COLS, v.layout.titleRows, v.layout.titleAlign)
  const secondaryLines = board.secondaryRaw.trim()
    ? wrapAligned(board.secondaryRaw, SPLIT_FLAP_SECONDARY_COLS, v.layout.secondaryRows, v.layout.secondaryAlign)
    : [board.secondary]
  const showSecondary = v.layout.secondaryRows > 0
  const brandLabel = message?.brandLabel ?? 'RADIO BLACKHOLE'
  const accent = accentColor(v)
  const fxClasses = [
    v.edgeGlow ? 'sf-cabinet--glow' : '',
    v.flicker ? 'sf-cabinet--flicker' : '',
    v.panelNoise ? 'sf-cabinet--noise' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const cabinetStyle = { '--sf-accent': accent, ...styleVars(v) } as CSSProperties

  return (
    <SplitFlapVisualProvider value={settings}>
      <div style={brandRowStyle}>
        <span style={{ ...brandStyle, flex: 1, textAlign: v.layout.brandAlign }}>{brandLabel}</span>
        <span style={aperçuStyle}>APERÇU</span>
      </div>
      <div className={`sf-cabinet sf-cabinet--preview ${presetClass(v.preset)} ${fxClasses}`.trim()} style={cabinetStyle}>
        {useHotFx && hotfx ? (
          <>
            <HotFxSplitFlap
              className="sf-hotfx sf-hotfx--title"
              text={hotfx.titleText}
              width={SPLIT_FLAP_TITLE_COLS}
              height={hotfx.titleHeight}
              durationMs={v.hotfxDurationMs}
              characters={v.hotfxCharacters}
            />
            {hotfx.secondaryHeight > 0 && (
              <HotFxSplitFlap
                className="sf-hotfx sf-hotfx--secondary"
                text={hotfx.secondaryText}
                width={SPLIT_FLAP_SECONDARY_COLS}
                height={hotfx.secondaryHeight}
                durationMs={v.hotfxDurationMs}
                characters={v.hotfxCharacters}
              />
            )}
            <HotFxSplitFlap
              className="sf-hotfx sf-hotfx--note"
              text={isScroll ? noteScrollDisplay.join('\n') : rawNoteLines.join('\n')}
              width={SPLIT_FLAP_NOTE_COLS}
              height={noteHeight}
              durationMs={v.hotfxDurationMs}
              characters={v.hotfxCharacters}
            />
          </>
        ) : (
          <>
            <SplitFlapDisplay lines={titleLines} variant="title" />
            {showSecondary && <SplitFlapDisplay lines={secondaryLines} variant="secondary" />}
            <SplitFlapDisplay key={`note:${isScroll ? 'scroll' : notePage}`} lines={isScroll ? noteScrollDisplay : rawNoteLines} variant="note" />
          </>
        )}
        <RadioTicker
          text={board.ticker}
          enabled={v.tickerEnabled}
          speedMs={v.tickerSpeedMs}
          direction={v.tickerDirection}
          separator={v.tickerSeparator}
        />
      </div>
    </SplitFlapVisualProvider>
  )
}

// Bandeau brand au-dessus de l'aperçu : reflète brandLabel live (≠ mainTitle).
const brandRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontFamily: 'var(--mono, ui-monospace, Consolas, monospace)',
  fontSize: 11,
  letterSpacing: 2,
  color: '#9ca3af',
  textTransform: 'uppercase',
  padding: '0 2px 4px',
}
const brandStyle: CSSProperties = { fontWeight: 700, color: '#f5d76b' }
const aperçuStyle: CSSProperties = { color: '#6b7280' }