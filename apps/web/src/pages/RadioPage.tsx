import { useEffect, useRef, useState } from 'react'
import { useLiveKitListen } from '../hooks/useLiveKitListen'
import { useBroadcastMessage } from '../hooks/useBroadcastMessage'
import { ListenerVolume } from '../components/ListenerVolume'
import { getOrCreateIdentity } from '../utils/identity'
import { SplitFlapDisplay } from '../components/splitflap/SplitFlapDisplay'
import { RadioTicker } from '../components/splitflap/RadioTicker'
import {
  formatBroadcastMessage,
  SPLIT_FLAP_PAGE_DURATION_MS,
} from '../components/splitflap/format'
import '../components/splitflap/splitflap.css'

const ROOM_NAME = 'main'

/**
 * Page radio publique : interface split-flap rétro (inspirée de flipoff).
 * Remplace l'ancienne présentation listener. Aucun debug public, aucun lien
 * vers /performer. L'audio reste le flux LiveKit raw (useLiveKitListen).
 */
export function RadioPage() {
  const [myIdentity] = useState(() => getOrCreateIdentity('listener'))
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
  // messageKey change à chaque message publié (updatedAt serveur) → force le
  // reflip intégral même si le texte est identique. '' pour le message défaut.
  const messageKey = broadcast.updatedAt || 'default'

  // Pagination de la note : cycle de page toutes les 6 s. Si une seule page,
  // l'index reste 0 (pas de timer inutile). ponytail: reset quand le message
  // change (on repart de la page 0).
  const notePages = board.notePages
  const [notePage, setNotePage] = useState(0)
  useEffect(() => {
    setNotePage(0)
    if (notePages.length <= 1) return
    const t = window.setInterval(
      () => setNotePage((p) => (p + 1) % notePages.length),
      SPLIT_FLAP_PAGE_DURATION_MS,
    )
    return () => clearInterval(t)
  }, [notePages])

  const connected = phase === 'connecting' || phase === 'connected' || phase === 'listening'
  const showReconnect = lost && phase === 'disconnected' && !reconnecting
  const isLive = phase === 'listening'
  const statusKey: 'live' | 'connecting' | 'offline' = isLive
    ? 'live'
    : phase === 'connecting' || phase === 'connected'
      ? 'connecting'
      : 'offline'
  const statusLabel = statusKey === 'live' ? 'LIVE' : statusKey === 'connecting' ? 'CONNECTING' : 'OFFLINE'

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
          régions sont keyées par messageKey (updatedAt) / pageKey → à tout
          changement, React remonte les tuiles et rejoue le flip intégral, même
          si une lettre reste identique (titre au nouveau message, note à chaque
          page). */}
      <div className="sf-cabinet">
        <SplitFlapDisplay key={`title:${messageKey}`} lines={[board.title]} variant="title" />
        <SplitFlapDisplay key={`secondary:${messageKey}`} lines={[board.secondary]} variant="secondary" />
        <SplitFlapDisplay key={`note:${messageKey}:${notePage}`} lines={notePages[notePage] ?? notePages[0]} variant="note" />
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

      {lost && phase === 'disconnected' && (
        <p style={{ color: '#b45309', fontFamily: 'var(--mono)', fontSize: 12 }}>
          ⚠ Connexion perdue. {reconnecting ? 'Reconnexion…' : 'Tentatives épuisées.'}
        </p>
      )}
      {error && (
        <p style={{ color: '#ef4444', fontFamily: 'var(--mono)', fontSize: 12 }}>❌ {error}</p>
      )}

      <p className="sf-footer">RADIO BLACKHOLE · LIVE WEB AUDIO · WEBRTC</p>

      {/* Conteneur invisible pour les <audio> distants. */}
      <div ref={audioHostRef} style={{ width: 0, height: 0, overflow: 'hidden' }} />
    </main>
  )
}