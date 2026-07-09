import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SplitFlapDisplay } from './SplitFlapDisplay'
import { RadioTicker } from './RadioTicker'
import {
  formatBroadcastMessage,
  wrapCentered,
  SPLIT_FLAP_TITLE_COLS,
  SPLIT_FLAP_SECONDARY_COLS,
  SPLIT_FLAP_NOTE_COLS,
  SPLIT_FLAP_NOTE_ROWS,
} from './format'
import { resolveVisual, presetClass, accentColor, styleVars } from './visual'
import { SplitFlapVisualProvider, type SplitFlapVisualSettings } from './SplitFlapContext'
import { HotFxSplitFlap } from '../hotfx/HotFxSplitFlap'
import { hotfxLayout, noteHeightFor } from '../hotfx/layout'
import type { BroadcastInput, BroadcastMessage } from '../../api/broadcastMessage'

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
  const notePages = hotfx ? hotfx.notePages : board.notePages

  // Pagination note : static = page 0, paged/scroll = cycle.
  const [notePage, setNotePage] = useState(0)
  useEffect(() => {
    setNotePage(0)
    if (v.noteMode === 'static' || notePages.length <= 1) return
    // ponytail: scroll mappé sur paged (pas de vraie grille défilante).
    const t = window.setInterval(() => setNotePage((p) => (p + 1) % notePages.length), v.pageDurationMs)
    return () => clearInterval(t)
  }, [notePages, v.noteMode, v.pageDurationMs])

  const rawNoteLines = v.noteMode === 'static' ? notePages[0] : notePages[notePage] ?? notePages[0]
  const noteHeight = hotfx ? noteHeightFor(v, rawNoteLines.length) : SPLIT_FLAP_NOTE_ROWS
  const titleLines = wrapCentered(board.titleRaw, SPLIT_FLAP_TITLE_COLS, v.layout.titleRows)
  const secondaryLines = board.secondaryRaw.trim()
    ? wrapCentered(board.secondaryRaw, SPLIT_FLAP_SECONDARY_COLS, v.layout.secondaryRows)
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
        <span style={brandStyle}>{brandLabel}</span>
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
              text={rawNoteLines.join('\n')}
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
            <SplitFlapDisplay key={`note:${notePage}`} lines={rawNoteLines} variant="note" />
          </>
        )}
        <RadioTicker text={board.ticker} />
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