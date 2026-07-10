import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveKitListen } from '../hooks/useLiveKitListen'
import { useBroadcastMessage } from '../hooks/useBroadcastMessage'
import { useListenerAudioAnalysis } from '../hooks/useListenerAudioAnalysis'
import { useAudioReceiverStats } from '../audio/audioReceiverStats'
import { ListenerVolume } from '../components/ListenerVolume'
import { AudioMonitorPanel } from '../components/audio-monitor/AudioMonitorPanel'
import { ThemeToggle, useTheme } from '../components/ThemeToggle'
import { getOrCreateIdentity } from '../utils/identity'
import { SplitFlapDisplay } from '../components/splitflap/SplitFlapDisplay'
import { RadioTicker } from '../components/splitflap/RadioTicker'
import {
  formatBroadcastMessage,
  wrapAligned,
  notePagesAligned,
  trimEmptyDisplayLines,
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
    getAudioRxReport,
  } = useLiveKitListen(ROOM_NAME, myIdentity, audioHostRef, analyser)
  const { display: broadcast } = useBroadcastMessage()
  // Débit audio WebRTC reçu (kbps / jitter / loss) — trafic réseau entrant, ≠ niveau.
  const audioRx = useAudioReceiverStats(getAudioRxReport, phase === 'listening')

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
  // Largeur de grille commune (toutes les zones = même nombre de colonnes).
  const cols = visual.layout.boardColumns

  // Mode note : scroll = défilement char-par-char dans les tuiles (vrai bandeau
  // de gare) ; paged = cycle de pages à pageDurationMs ; static = page 0 fixe.
  const isScroll = visual.noteMode === 'scroll'
  const notePages = isScroll
    ? []
    : hotfx
      ? hotfx.notePages
      : notePagesAligned(board.noteRaw, cols, SPLIT_FLAP_NOTE_ROWS, visual.layout.noteAlign)
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
    cols,
    scrollRows,
    visual.noteScrollSpeedMs,
    visual.noteScrollStep,
    visual.noteScrollLoop,
    isScroll,
  )
  // Scroll + texte plus court que la zone : on aligne (noteAlign) au lieu de défiler.
  const noteFitsScroll = isScroll && board.noteRaw.length <= scrollRows * cols
  const noteScrollDisplay = noteFitsScroll
    ? wrapAligned(board.noteRaw, cols, scrollRows, visual.layout.noteAlign)
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

  // Thème Day / Night (toggle header, persisté localStorage). Cf. ThemeToggle.
  const { theme, toggle } = useTheme()
  // Débit audio WebRTC reçu (kbps) — trafic réseau entrant, ≠ niveau sonore.
  // ponytail: jitter/loss retirés du chrome public (footer compact). Les stats Rx
  // complètes restent visibles dans AudioMonitorPanel ; remettre si un onglet réseau revient.
  const rxKbps = isLive && audioRx.available ? `${audioRx.kbps ?? '—'}` : '—'

  const rawNoteLines = trimEmptyDisplayLines(
    isScroll ? [] : visual.noteMode === 'static' ? notePages[0] : notePages[notePage] ?? notePages[0],
  )
  const noteHeight = hotfx ? (isScroll ? scrollRows : noteHeightFor(visual, rawNoteLines.length)) : SPLIT_FLAP_NOTE_ROWS
  // Lignes titre/secondaire selon les rows + alignement du layout (grille continue).
  const titleLines = wrapAligned(board.titleRaw, cols, visual.layout.titleRows, visual.layout.titleAlign)
  const hasSecondary = board.secondaryRaw.trim().length > 0
  const secondaryLines = hasSecondary
    ? wrapAligned(board.secondaryRaw, cols, visual.layout.secondaryRows, visual.layout.secondaryAlign)
    : []
  // Zone secondaire masquée si pas de contenu (≠ juste secondaryRows=0).
  const showSecondary = visual.layout.secondaryRows > 0 && hasSecondary
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
    <main className="pub">
      {/* Header éditorial fin */}
      <header className="pub-header">
        <a className="pub-logo" href="/">RADIO BLACKHOLE</a>
        <nav className="pub-nav" aria-label="Navigation radio">
          <a href="/">HOME</a>
          <a href="/listen">LISTEN</a>
          <a href="#monitor">MONITOR</a>
          <a href="#info">INFO</a>
        </nav>
        <div className="pub-header__right">
          <span className="pub-status" title={`Statut flux : ${statusLabel}`}>
            <span className={`sf-dot${statusKey === 'live' ? ' live' : statusKey === 'connecting' ? ' connecting' : ''}`} />
            {statusLabel}
          </span>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </header>

      {/* Signal Display : le board split-flap domine la page (plus de hero).
          Contenu direct dans .pub — index technique déplacé en footer bas. */}
      <section id="display" className="pub-section">
            <div className="pub-section__head">
              <span className="pub-section__label">Signal Display</span>
              <span className="pub-section__meta">Current transmission</span>
              <span className="pub-section__id">#{messageKey.slice(0, 12) || 'default'}</span>
            </div>

            {/* Le brandLabel du header du board reste piloté par l'alignement
                performer (brandAlign). On l'affiche au-dessus du cabinet comme
                étiquette de la station, alignée pareil. */}
            <div style={{ textAlign: visual.layout.brandAlign, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text)' }}>
              {brandLabel}
            </div>

            {/* Board split-flap : écran sombre continu (zone HotFX/internal +
                ticker). Wrapper flex colonne → board flex:1 remnit la hauteur
                hero ; scroll horizontal sur petit écran. */}
            <SplitFlapVisualProvider value={settings}>
              <div className="pub-boardwrap">
                <div className={`sf-cabinet ${presetClass(visual.preset)} ${fxClasses}`.trim()} style={cabinetStyle}>
                  {useHotFx && hotfx ? (
                    <>
                      <HotFxSplitFlap
                        className="sf-hotfx sf-hotfx--title"
                        text={hotfx.titleText}
                        width={cols}
                        height={hotfx.titleHeight}
                        durationMs={visual.hotfxDurationMs}
                        characters={visual.hotfxCharacters}
                      />
                      {hotfx.secondaryHeight > 0 && (
                        <HotFxSplitFlap
                          className="sf-hotfx sf-hotfx--secondary"
                          text={hotfx.secondaryText}
                          width={cols}
                          height={hotfx.secondaryHeight}
                          durationMs={visual.hotfxDurationMs}
                          characters={visual.hotfxCharacters}
                        />
                      )}
                      <HotFxSplitFlap
                        className="sf-hotfx sf-hotfx--note"
                        text={isScroll ? noteScrollDisplay.join('\n') : rawNoteLines.join('\n')}
                        width={cols}
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
                </div>
              </div>
            </SplitFlapVisualProvider>

            {/* Ligne de contrôles listener — compacte, type instrument panel.
                Fonctions intactes : listen/stop/reconnect/autoriser + volume
                (clic mute, double-clic PAD -30 dB). RX déplacé dans le rail. */}
            <div className="pub-controls">
              {!connected && !lost && (
                <button type="button" data-variant="primary" onClick={() => void listenLive()}>
                  ▶ Listen live
                </button>
              )}
              {connected && (
                <button type="button" onClick={stopListening}>
                  ■ Stop
                </button>
              )}
              {showReconnect && (
                <button type="button" onClick={() => void reconnect()}>
                  ↻ Reconnect
                </button>
              )}
              {needGesture && connected && (
                <button type="button" onClick={() => void startAudio()}>
                  Autoriser l’audio
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

            {lost && phase === 'disconnected' && (
              <p className="pub-alert pub-alert--warn">
                ⚠ Connexion perdue. {reconnecting ? 'Reconnexion…' : 'Tentatives épuisées.'}
              </p>
            )}
            {error && <p className="pub-alert pub-alert--error">❌ {error}</p>}
          </section>

          {/* Audio Monitor : panneau éditorial. Visu et logique inchangées
              (tabs, VU/dB/spectrum/spectrogram/stereo/spectral, resize). */}
          <section id="monitor" className="pub-section">
            <div className="pub-section__head">
              <span className="pub-section__label">Audio Monitor</span>
              <span className="pub-section__meta">Realtime analysis · local browser</span>
              <span className="pub-section__id">≠ LUFS broadcast</span>
            </div>
            <AudioMonitorPanel analyser={analyser} active={phase === 'listening'} />
          </section>

      {/* Pied technique : index compact en bas (anciennement rail gauche).
          Lignes fines, mono — présence réduite, pas de gros bloc, pas sticky. */}
      <footer id="info" className="pub-techfoot">
        <div className="pub-techfoot__meta">
          <span>STREAM<b>{statusLabel}</b></span>
          <span>ENGINE<b>{engine}</b></span>
          <span>RX<b>{rxKbps === '—' ? '—' : `${rxKbps} kbps`}</b></span>
          <span>UPDATED<b>{broadcast?.updatedAt ?? '—'}</b></span>
        </div>
        <div className="pub-techfoot__brand">RADIO BLACKHOLE · PIRATE WEBRTC · LISTEN LIVE</div>
      </footer>

      {/* Conteneur invisible pour les <audio> distants. */}
      <div ref={audioHostRef} style={{ width: 0, height: 0, overflow: 'hidden' }} />
    </main>
  )
}