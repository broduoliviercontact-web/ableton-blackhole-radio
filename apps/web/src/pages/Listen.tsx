import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useLiveKitListen } from '../hooks/useLiveKitListen'
import { ConfigCheckButton } from '../components/ConfigCheckButton'
import { getOrCreateIdentity } from '../utils/identity'

const ROOM_NAME = 'main'

export function Listen() {
  const [myIdentity] = useState(() => getOrCreateIdentity('listener'))
  const audioHostRef = useRef<HTMLDivElement>(null)
  const {
    phase,
    error,
    identity,
    roomName,
    lost,
    reconnecting,
    needGesture,
    listenLive,
    stopListening,
    reconnect,
    startAudio,
  } = useLiveKitListen(ROOM_NAME, myIdentity, audioHostRef)

  const connected = phase === 'connecting' || phase === 'connected' || phase === 'listening'
  const showReconnect = lost && phase === 'disconnected' && !reconnecting
  const hasAudio = phase === 'listening'

  return (
    <main style={mainStyle}>
      <h1>Listener</h1>
      <p>Receive live audio stream</p>

      <div style={rowStyle}>
        {!connected && !lost && (
          <button type="button" onClick={() => void listenLive()}>
            Listen live
          </button>
        )}
        {connected && (
          <button type="button" onClick={stopListening}>
            Stop listening
          </button>
        )}
        {showReconnect && (
          <button type="button" onClick={() => void reconnect()}>
            Reconnect
          </button>
        )}
      </div>

      {needGesture && connected && (
        <button type="button" onClick={() => void startAudio()}>
          Autoriser la lecture audio
        </button>
      )}

      <p style={mutedStyle}>
        État : {phase} · room : {roomName}
        {identity ? ` · ${identity}` : ''}
      </p>
      {lost && phase === 'disconnected' && (
        <p style={warnStyle}>
          ⚠ Connexion perdue.{' '}
          {reconnecting ? 'Reconnexion automatique en cours…' : 'Tentatives automatiques épuisées.'}
        </p>
      )}
      {connected && !hasAudio && <p style={mutedStyle}>Connecté à la room. En attente du performer.</p>}
      {hasAudio && <p style={liveStyle}>🎧 En écoute — flux audio reçu</p>}
      {error && <p style={errorStyle}>❌ {error}</p>}

      {/* Conteneur invisible pour les éléments <audio> distants. */}
      <div ref={audioHostRef} style={hostStyle} />

      <section style={sectionStyle}>
        <h2 style={h2Style}>Debug</h2>
        <ConfigCheckButton />
      </section>
    </main>
  )
}

const mainStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 640,
  margin: '0 auto',
  padding: 24,
}
const rowStyle: CSSProperties = { display: 'flex', gap: 8, marginBottom: 8 }
const mutedStyle: CSSProperties = { color: '#6b7280', fontSize: 14 }
const errorStyle: CSSProperties = { color: 'crimson' }
const warnStyle: CSSProperties = { color: '#b45309' }
const liveStyle: CSSProperties = { color: 'green' }
const hostStyle: CSSProperties = { width: 0, height: 0, overflow: 'hidden' }
const sectionStyle: CSSProperties = { borderTop: '1px solid #e5e7eb', marginTop: 16, paddingTop: 16 }
const h2Style: CSSProperties = { fontSize: 18, margin: '0 0 8px' }