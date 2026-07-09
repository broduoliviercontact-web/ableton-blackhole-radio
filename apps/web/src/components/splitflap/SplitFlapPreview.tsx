import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SplitFlapDisplay } from './SplitFlapDisplay'
import { RadioTicker } from './RadioTicker'
import { formatBroadcastMessage, SPLIT_FLAP_TITLE_COLS, SPLIT_FLAP_SECONDARY_COLS, SPLIT_FLAP_NOTE_COLS, SPLIT_FLAP_NOTE_ROWS } from './format'
import { resolveVisual, presetClass, accentColor } from './visual'
import { SplitFlapVisualProvider, type SplitFlapVisualSettings } from './SplitFlapContext'
import { HotFxSplitFlap } from '../hotfx/HotFxSplitFlap'
import type { BroadcastInput, BroadcastMessage } from '../../api/broadcastMessage'

export type SplitFlapEngine = 'internal' | 'hotfx'

interface Props {
  message: BroadcastInput | BroadcastMessage | null
  // Moteur de l'aperçu, local au performer (non persisté, non publié).
  engine?: SplitFlapEngine
}

/**
 * Aperçu split-flap côté performer : reprend les mêmes composants que la page
 * publique, en plus petit (classe sf-cabinet--preview). Pas d'audio, pas de
 * contrôles. Le flip se fait par tuile (char-change) — l'aperçu « vit » pendant
 * la saisie sans reflash global.
 */
export function SplitFlapPreview({ message, engine = 'internal' }: Props) {
  const board = formatBroadcastMessage(message)
  const v = resolveVisual(message?.visual)
  const settings: SplitFlapVisualSettings = {
    transition: v.transition,
    scrambleDurationMs: v.scrambleDurationMs,
    staggerDelayMs: v.staggerDelayMs,
    scrambleColors: v.scrambleColors,
  }
  const hotfxDuration = Math.max(80, Math.min(v.scrambleDurationMs, 800))

  // Pagination de la note (static = page 0, paged/scroll = cycle).
  const [notePage, setNotePage] = useState(0)
  useEffect(() => {
    setNotePage(0)
    if (v.noteMode === 'static' || board.notePages.length <= 1) return
    // ponytail: scroll mappé sur paged (le ticker gère déjà le défilement).
    const t = window.setInterval(() => setNotePage((p) => (p + 1) % board.notePages.length), v.pageDurationMs)
    return () => clearInterval(t)
  }, [board.notePages, v.noteMode, v.pageDurationMs])

  const noteLines = v.noteMode === 'static' ? board.notePages[0] : board.notePages[notePage] ?? board.notePages[0]
  const accent = accentColor(v)
  const cabinetStyle = { '--sf-accent': accent } as CSSProperties

  return (
    <SplitFlapVisualProvider value={settings}>
      <div className={`sf-cabinet sf-cabinet--preview ${presetClass(v.preset)}`} style={cabinetStyle}>
        {engine === 'hotfx' ? (
          <>
            <HotFxSplitFlap
              className="sf-hotfx sf-hotfx--title"
              text={board.title}
              width={SPLIT_FLAP_TITLE_COLS}
              height={1}
              durationMs={hotfxDuration}
            />
            <HotFxSplitFlap
              className="sf-hotfx sf-hotfx--secondary"
              text={board.secondary}
              width={SPLIT_FLAP_SECONDARY_COLS}
              height={1}
              durationMs={hotfxDuration}
            />
            <HotFxSplitFlap
              className="sf-hotfx sf-hotfx--note"
              text={noteLines.join('\n')}
              width={SPLIT_FLAP_NOTE_COLS}
              height={SPLIT_FLAP_NOTE_ROWS}
              durationMs={hotfxDuration}
            />
          </>
        ) : (
          <>
            <SplitFlapDisplay lines={[board.title]} variant="title" />
            <SplitFlapDisplay lines={[board.secondary]} variant="secondary" />
            <SplitFlapDisplay key={`note:${notePage}`} lines={noteLines} variant="note" />
          </>
        )}
        <RadioTicker text={board.ticker} />
      </div>
    </SplitFlapVisualProvider>
  )
}