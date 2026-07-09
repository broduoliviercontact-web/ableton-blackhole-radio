import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveKitListen } from '../hooks/useLiveKitListen'
import { useBroadcastMessage } from '../hooks/useBroadcastMessage'
import { useListenerAudioAnalysis } from '../hooks/useListenerAudioAnalysis'
import { ListenerVolume } from '../components/ListenerVolume'
import { AudioMonitorPanel } from '../components/audio-monitor/AudioMonitorPanel'
import { getOrCreateIdentity } from '../utils/identity'
import { SplitFlapDisplay } from '../components/splitflap/SplitFlapDisplay'
import { RadioTicker } from '../components/splitflap/RadioTicker'
import {
  formatBroadcastMessage,
  wrapAligned,
  notePagesAligned,
  SPLIT_FLAP_TITLE_COLS,
  SPLIT_FLAP_SECONDARY_COLS,
  SPLIT_FLAP_NOTE_COLS,
  SPLIT_FLAP_NOTE_ROWS,
} from '../components/splitflap/format'
import { resolveVisual, presetClass, accentColor, styleVars } from '../components/splitflap/visual'
import { useScrollingTextWindow } from '../components/splitflap/useScrollingTextWindow'
import { SplitFlapVisualProvider, type SplitFlapVisualSettings } from '../components/splitflap/SplitFlapContext'
import { HotFxSplitFlap } from '../components/hotfx/HotFxSplitFlap'
import { hotfxLayout, noteHeightFor } from '../components/hotfx/layout'
import type { VisualEngine } from '../api/broadcastMessage'
import '../components/splitflap/splitflap.css'
import '../components/hotfx/hotfx.css'

const ROOM_NAME = 'main'

/**
 * Page radio publique : panneau split-flap continu (type gare/aéroport).
 * Aucun debug public, aucun lien vers /performer. L'audio reste le flux LiveKit
 * raw (useLiveKitListen). Les réglages visuels (message.visual) pilotent moteur
 * (internal/hotfx), preset, transition, stagger, pagination, couleurs et style.
 *
 * Moteur : priorité ?engine=internal|hotfx (override debug local) →
 * message.visual.splitFlapEngine → « internal ».
 */
export function RadioPage() {
  const [myIdentity] = useState(() => getOrCreateIdentity('listener'))
  const [engineOverride] = useState<VisualEngine | null>(() => {
    const q = new URLSearchParams(window.location.search).get('engine')
    return q === 'internal' || q === 'hotfx' ? q : null
  })
  const audioHostRef = useRef<HTMLDivElement>(null)
  const analyser = useListenerAudioAnalysis()
  const {
    phase,
    error,
    lost,
    reconnecting,
    needGesture,
    listenerVolume,
    muted,
    trimMinus30Db,
    listenLive,
    stopListening,
    reconnect,
    startAudio,
    setListenerVolume,
    toggleMute,
    toggleTrimMinus30Db,
  } = useLiveKitListen(ROOM_NAME, myIdentity, audioHostRef, analyser)
  const { display: broadcast } = useBroadcastMessage()

  const board = formatBroadcastMessage(broadcast)
  const visual = resolveVisual(broadcast?.visual)
  const engine: VisualEngine = engineOverride ?? visual.splitFlapEngine
  const useHotFx = engine === 'hotfx'
  // messageKey change à chaque message publié (updatedAt serveur) → force le
  // reflip intégral, même si le texte est identique. '' pour le défaut.
  const messageKey = broadcast.updatedAt || 'default'

  const settings: SplitFlapVisualSettings = {
    transition: visual.transition,
    scrambleDurationMs: visual.scrambleDurationMs,
    staggerDelayMs: visual.staggerDelayMs,
    scrambleColors: visual.scrambleColors,
  }

  // Layout HotFX (zones + hauteurs dynamiques). null en mode internal.
  const hotfx = useHotFx ? hotfxLayout(board, visual) : null

  // Mode note : scroll = défilement char-par-char dans les tuiles (vrai bandeau
  // de gare) ; paged = cycle de pages à pageDurationMs ; static = page 0 fixe.
  const isScroll = visual.noteMode === 'scroll'
  const notePages = isScroll
    ? []
    : hotfx
      ? hotfx.notePages
      : notePagesAligned(board.noteRaw, SPLIT_FLAP_NOTE_COLS, SPLIT_FLAP_NOTE_ROWS, visual.layout.noteAlign)
  const [notePage, setNotePage] = useState(0)
  useEffect(() => {
    setNotePage(0)
    if (isScroll || visual.noteMode === 'static' || notePages.length <= 1) return
    const t = window.setInterval(() => setNotePage((p) => (p + 1) % notePages.length), visual.pageDurationMs)
    return () => clearInterval(t)
  }, [notePages, visual.noteMode, visual.pageDurationMs, isScroll])

  // Fenêtre défilante (scroll) : rows selon le moteur (internal = 4, HotFX = noteRowsMax).
  const scrollRows = hotfx ? visual.noteRowsMax : SPLIT_FLAP_NOTE_ROWS
  const scrollLines = useScrollingTextWindow(
    board.noteRaw,
    SPLIT_FLAP_NOTE_COLS,
    scrollRows,
    visual.noteScrollSpeedMs,
    visual.noteScrollStep,
    visual.noteScrollLoop,
    isScroll,
  )
  // Scroll + texte plus court que la zone : on aligne (noteAlign) au lieu de défiler.
  const noteFitsScroll = isScroll && board.noteRaw.length <= scrollRows * SPLIT_FLAP_NOTE_COLS
  const noteScrollDisplay = noteFitsScroll
    ? wrapAligned(board.noteRaw, SPLIT_FLAP_NOTE_COLS, scrollRows, visual.layout.noteAlign)
    : scrollLines

  const connected = phase === 'connecting' || phase === 'connected' || phase === 'listening'
  const showReconnect = lost && phase === 'disconnected' && !reconnecting
  const isLive = phase === 'listening'
  const statusKey: 'live' | 'connecting' | 'offline' = isLive
    ? 'live'
    : phase === 'connecting' || phase === 'connected'
      ? 'connecting'
      : 'offline'
  const statusLabel = statusKey === 'live' ? 'LIVE' : statusKey === 'connecting' ? 'CONNECTING' : 'OFFLINE'

  const rawNoteLines = isScroll ? [] : visual.noteMode === 'static' ? notePages[0] : notePages[notePage] ?? notePages[0]
  const noteHeight = hotfx ? (isScroll ? scrollRows : noteHeightFor(visual, rawNoteLines.length)) : SPLIT_FLAP_NOTE_ROWS
  // Lignes titre/secondaire selon les rows + alignement du layout (grille continue).
  const titleLines = wrapAligned(board.titleRaw, SPLIT_FLAP_TITLE_COLS, visual.layout.titleRows, visual.layout.titleAlign)
  const secondaryLines = board.secondaryRaw.trim()
    ? wrapAligned(board.secondaryRaw, SPLIT_FLAP_SECONDARY_COLS, visual.layout.secondaryRows, visual.layout.secondaryAlign)
    : [board.secondary]
  const showSecondary = visual.layout.secondaryRows > 0
  const brandLabel = broadcast?.brandLabel ?? 'RADIO BLACKHOLE'
  const accent = accentColor(visual)
  const fxClasses = [
    visual.edgeGlow ? 'sf-cabinet--glow' : '',
    visual.flicker ? 'sf-cabinet--flicker' : '',
    visual.panelNoise ? 'sf-cabinet--noise' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const cabinetStyle = { '--sf-accent': accent, ...styleVars(visual) } as CSSProperties

  return (
    <main className="sf-page">
      <header className="sf-header">
        <span className="sf-brand" style={{ flex: 1, textAlign: visual.layout.brandAlign }}>{brandLabel}</span>
        <span className="sf-status">
          <span className={`sf-dot${statusKey === 'live' ? ' live' : statusKey === 'connecting' ? ' connecting' : ''}`} />
          {statusLabel}
        </span>
      </header>

      {/* Un seul cadre continu : les 4 zones split-flap vivent dedans. En mode
          internal les régions sont keyées par messageKey/pageKey → reflip intégral
          à tout changement. En mode HotFX le textContent change → MutationObserver
          relance l'animation (pas de remount). */}
      <SplitFlapVisualProvider value={settings}>
        <div className={`sf-cabinet ${presetClass(visual.preset)} ${fxClasses}`.trim()} style={cabinetStyle}>
          {useHotFx && hotfx ? (
            <>
              <HotFxSplitFlap
                className="sf-hotfx sf-hotfx--title"
                text={hotfx.titleText}
                width={SPLIT_FLAP_TITLE_COLS}
                height={hotfx.titleHeight}
                durationMs={visual.hotfxDurationMs}
                characters={visual.hotfxCharacters}
              />
              {hotfx.secondaryHeight > 0 && (
                <HotFxSplitFlap
                  className="sf-hotfx sf-hotfx--secondary"
                  text={hotfx.secondaryText}
                  width={SPLIT_FLAP_SECONDARY_COLS}
                  height={hotfx.secondaryHeight}
                  durationMs={visual.hotfxDurationMs}
                  characters={visual.hotfxCharacters}
                />
              )}
              <HotFxSplitFlap
                className="sf-hotfx sf-hotfx--note"
                text={isScroll ? noteScrollDisplay.join('\n') : rawNoteLines.join('\n')}
                width={SPLIT_FLAP_NOTE_COLS}
                height={noteHeight}
                durationMs={visual.hotfxDurationMs}
                characters={visual.hotfxCharacters}
              />
            </>
          ) : (
            <>
              <SplitFlapDisplay key={`title:${messageKey}`} lines={titleLines} variant="title" />
              {showSecondary && (
                <SplitFlapDisplay key={`secondary:${messageKey}`} lines={secondaryLines} variant="secondary" />
              )}
              <SplitFlapDisplay
                key={`note:${messageKey}:${isScroll ? 'scroll' : notePage}`}
                lines={isScroll ? noteScrollDisplay : rawNoteLines}
                variant="note"
              />
            </>
          )}
          <RadioTicker
            text={board.ticker}
            enabled={visual.tickerEnabled}
            speedMs={visual.tickerSpeedMs}
            direction={visual.tickerDirection}
            separator={visual.tickerSeparator}
          />

          <div className="sf-controls">
            {!connected && !lost && (
              <button type="button" onClick={() => void listenLive()}>
                ▶ LISTEN LIVE
              </button>
            )}
            {connected && (
              <button type="button" onClick={stopListening}>
                ■ STOP
              </button>
            )}
            {showReconnect && (
              <button type="button" onClick={() => void reconnect()}>
                ↻ RECONNECT
              </button>
            )}
            {needGesture && connected && (
              <button type="button" onClick={() => void startAudio()}>
                AUTORISER L'AUDIO
              </button>
            )}
            {connected && (
              <div className="sf-vol">
                <ListenerVolume
                  volume={listenerVolume}
                  muted={muted}
                  trimMinus30Db={trimMinus30Db}
                  onVolumeChange={setListenerVolume}
                  onToggleMute={toggleMute}
                  onToggleTrimMinus30Db={toggleTrimMinus30Db}
                />
              </div>
            )}
          </div>
        </div>
      </SplitFlapVisualProvider>

      {lost && phase === 'disconnected' && (
        <p style={{ color: '#b45309', fontFamily: 'var(--mono)', fontSize: 12 }}>
          ⚠ Connexion perdue. {reconnecting ? 'Reconnexion…' : 'Tentatives épuisées.'}
        </p>
      )}
      {error && (
        <p style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: 12 }}>❌ {error}</p>
      )}

      <p className="sf-footer">RADIO BLACKHOLE · PIRATE WEBRTC · LISTEN LIVE</p>

      {/* Audio Monitor (visualisations temps réel sur le flux LiveKit, sans
          l'altérer). Repliable par défaut → rAF stoppé tant que fermé. */}
      <AudioMonitorPanel analyser={analyser} active={phase === 'listening'} />

      {/* Conteneur invisible pour les <audio> distants. */}
      <div ref={audioHostRef} style={{ width: 0, height: 0, overflow: 'hidden' }} />
    </main>
  )
}