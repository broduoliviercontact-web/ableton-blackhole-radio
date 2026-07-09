import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveKitListen } from '../hooks/useLiveKitListen'
import { useBroadcastMessage } from '../hooks/useBroadcastMessage'
import { ListenerVolume } from '../components/ListenerVolume'
import { getOrCreateIdentity } from '../utils/identity'
import { SplitFlapDisplay } from '../components/splitflap/SplitFlapDisplay'
import { RadioTicker } from '../components/splitflap/RadioTicker'
import { formatBroadcastMessage, SPLIT_FLAP_TITLE_COLS, SPLIT_FLAP_SECONDARY_COLS, SPLIT_FLAP_NOTE_COLS, SPLIT_FLAP_NOTE_ROWS } from '../components/splitflap/format'
import { resolveVisual, presetClass, accentColor } from '../components/splitflap/visual'
import { SplitFlapVisualProvider, type SplitFlapVisualSettings } from '../components/splitflap/SplitFlapContext'
import { HotFxSplitFlap } from '../components/hotfx/HotFxSplitFlap'
import '../components/splitflap/splitflap.css'
import '../components/hotfx/hotfx.css'

const ROOM_NAME = 'main'

/**
 * Page radio publique : panneau split-flap continu (type gare/aéroport).
 * Aucun debug public, aucun lien vers /performer. L'audio reste le flux LiveKit
 * raw (useLiveKitListen). Les réglages visuels (message.visual) pilotent
 * preset, transition, stagger, pagination et couleurs.
 */
export function RadioPage() {
  const [myIdentity] = useState(() => getOrCreateIdentity('listener'))
  // Moteur split-flap expérimental, client-only : ?engine=hotfx active HotFX.
  // Aucun impact backend (le message publié ne porte pas ce choix).
  const [useHotFx] = useState(
    () => new URLSearchParams(window.location.search).get('engine') === 'hotfx',
  )
  const audioHostRef = useRef<HTMLDivElement>(null)
  const {
    phase,
    error,
    lost,
    reconnecting,
    needGesture,
    listenerVolume,
    muted,
    listenLive,
    stopListening,
    reconnect,
    startAudio,
    setListenerVolume,
    toggleMute,
  } = useLiveKitListen(ROOM_NAME, myIdentity, audioHostRef)
  const { display: broadcast } = useBroadcastMessage()

  const board = formatBroadcastMessage(broadcast)
  const visual = resolveVisual(broadcast?.visual)
  // messageKey change à chaque message publié (updatedAt serveur) → force le
  // reflip intégral, même si le texte est identique. '' pour le défaut.
  const messageKey = broadcast.updatedAt || 'default'

  const settings: SplitFlapVisualSettings = {
    transition: visual.transition,
    scrambleDurationMs: visual.scrambleDurationMs,
    staggerDelayMs: visual.staggerDelayMs,
    scrambleColors: visual.scrambleColors,
  }

  // Pagination de la note : static = page 0, paged/scroll = cycle à
  // pageDurationMs. Reset quand le message change (on repart page 0).
  const notePages = board.notePages
  const [notePage, setNotePage] = useState(0)
  useEffect(() => {
    setNotePage(0)
    if (visual.noteMode === 'static' || notePages.length <= 1) return
    // ponytail: scroll mappé sur paged (le ticker gère déjà le défilement).
    const t = window.setInterval(() => setNotePage((p) => (p + 1) % notePages.length), visual.pageDurationMs)
    return () => clearInterval(t)
  }, [notePages, visual.noteMode, visual.pageDurationMs])

  const connected = phase === 'connecting' || phase === 'connected' || phase === 'listening'
  const showReconnect = lost && phase === 'disconnected' && !reconnecting
  const isLive = phase === 'listening'
  const statusKey: 'live' | 'connecting' | 'offline' = isLive
    ? 'live'
    : phase === 'connecting' || phase === 'connected'
      ? 'connecting'
      : 'offline'
  const statusLabel = statusKey === 'live' ? 'LIVE' : statusKey === 'connecting' ? 'CONNECTING' : 'OFFLINE'

  const noteLines = visual.noteMode === 'static' ? notePages[0] : notePages[notePage] ?? notePages[0]
  const accent = accentColor(visual)
  const cabinetStyle = { '--sf-accent': accent } as CSSProperties
  // HotFX: duration = ms par chute de clapet (≠ total). Clamp pour rester lisible.
  const hotfxDuration = Math.max(80, Math.min(visual.scrambleDurationMs, 800))

  return (
    <main className="sf-page">
      <header className="sf-header">
        <span className="sf-brand">RADIO BLACKHOLE</span>
        <span className="sf-status">
          <span className={`sf-dot${statusKey === 'live' ? ' live' : statusKey === 'connecting' ? ' connecting' : ''}`} />
          {statusLabel}
        </span>
      </header>

      {/* Un seul cadre continu : les 4 zones split-flap vivent dedans. Les
          régions sont keyées par messageKey / pageKey → à tout changement, React
          remonte les tuiles et rejoue le flip intégral (titre au nouveau message,
          note à chaque page). */}
      <SplitFlapVisualProvider value={settings}>
        <div className={`sf-cabinet ${presetClass(visual.preset)}`} style={cabinetStyle}>
          {useHotFx ? (
            <>
              {/* HotFX expérimental : demi-clapets clip-path. Le textContent
                  change → MutationObserver relance l'animation (pas de key
                  remount). Limites : uppercase forcé, pas de reflip si texte
                  identique, pas de freeze reduced-motion. */}
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
              <SplitFlapDisplay key={`title:${messageKey}`} lines={[board.title]} variant="title" />
              <SplitFlapDisplay key={`secondary:${messageKey}`} lines={[board.secondary]} variant="secondary" />
              <SplitFlapDisplay key={`note:${messageKey}:${notePage}`} lines={noteLines} variant="note" />
            </>
          )}
          <RadioTicker text={board.ticker} />

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
                  onVolumeChange={setListenerVolume}
                  onToggleMute={toggleMute}
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

      {/* Conteneur invisible pour les <audio> distants. */}
      <div ref={audioHostRef} style={{ width: 0, height: 0, overflow: 'hidden' }} />
    </main>
  )
}