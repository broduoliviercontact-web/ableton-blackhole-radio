import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchToken } from '../api/token'
import { isMediaDevicesSupported, looksLikeBuiltInMic, requestAudioPermission } from '../audio/mediaDevices'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { useLocalAudioCapture } from '../hooks/useLocalAudioCapture'
import { useLiveKitBroadcast } from '../hooks/useLiveKitBroadcast'
import { useStreamSource } from '../hooks/useStreamSource'
import { ICECAST_STREAM_URL, type StreamSource } from '../api/streamSource'
import { AudioDeviceSelect } from '../components/AudioDeviceSelect'
import { AudioMeter } from '../components/AudioMeter'
import { ConfigCheckButton } from '../components/ConfigCheckButton'
import { RadioMessageForm } from '../components/RadioMessageForm'
import { cr } from '../components/controlRoom'
import { getOrCreateIdentity } from '../utils/identity'

type Permission = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'

function mapPermissionError(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError') return 'Permission micro refusée.'
    if (e.name === 'NotFoundError') return 'Aucun périphérique audio trouvé.'
    if (e.name === 'SecurityError') return 'Contexte non sécurisé (HTTPS/localhost requis).'
    return `Erreur : ${e.name}`
  }
  return e instanceof Error ? e.message : 'Erreur inconnue.'
}

export function Performer({ performerPassword }: { performerPassword: string }) {
  const supported = isMediaDevicesSupported()
  const [permission, setPermission] = useState<Permission>(supported ? 'idle' : 'unsupported')
  const [permError, setPermError] = useState<string | null>(null)

  const { devices, selectedId, setSelectedId, refresh } = useAudioDevices(permission === 'granted')
  const capture = useLocalAudioCapture()
  const broadcast = useLiveKitBroadcast(capture.stream)
  const { postFaderStream } = broadcast
  const [myIdentity] = useState(() => getOrCreateIdentity('performer'))
  const [masterVolume, setMasterVolume] = useState(100) // US-5 : fader master (défaut 100 %)
  const streamSource = useStreamSource()
  const [sourceSaveStatus, setSourceSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [sourceSaveError, setSourceSaveError] = useState<string | null>(null)
  // performerPassword vient du PerformerGate (validé côté backend). Jamais persisté.

  const capturing = capture.status === 'capturing'

  const handleVolumeChange = useCallback(
    (volume: number) => {
      setMasterVolume(volume)
      broadcast.setMasterVolume(volume) // live : pas de republication (US-5)
    },
    [broadcast],
  )

  // Relance capture : on stoppe d'abord le broadcast (la track publiée vient de
  // l'ancien flux) puis on démarre la nouvelle capture.
  const handleStartCapture = useCallback(async () => {
    await broadcast.stop()
    await capture.start(selectedId)
  }, [broadcast, capture, selectedId])

  // Stop capture : stoppe le broadcast d'abord (US-2.4), puis la capture.
  const handleStopCapture = useCallback(async () => {
    await broadcast.stop()
    capture.stop()
  }, [broadcast, capture])

  // --- Permission ---
  async function handleAuthorize() {
    setPermission('requesting')
    setPermError(null)
    try {
      await requestAudioPermission()
      setPermission('granted')
    } catch (e) {
      setPermission('denied')
      setPermError(mapPermissionError(e))
    }
  }

  // --- Lot 1 : test token (debug) ---
  const [tokenStatus, setTokenStatus] = useState('')
  const [tokenOk, setTokenOk] = useState<boolean | null>(null)
  async function testToken() {
    setTokenStatus('…')
    setTokenOk(null)
    try {
      const r = await fetchToken({ roomName: 'main', identity: 'performer-test', role: 'performer', performerPassword })
      setTokenStatus(`✅ token reçu — url: ${r.url} (${r.token.length} chars)`)
      setTokenOk(true)
    } catch (e) {
      setTokenStatus(`❌ ${e instanceof Error ? e.message : String(e)}`)
      setTokenOk(false)
    }
  }

  async function handleStreamSourceChange(activeSource: StreamSource) {
    if (activeSource === 'icecast' && !ICECAST_STREAM_URL) return
    setSourceSaveStatus('saving')
    setSourceSaveError(null)
    try {
      await streamSource.update(activeSource, performerPassword)
      setSourceSaveStatus('saved')
      window.setTimeout(() => setSourceSaveStatus('idle'), 1800)
    } catch (e) {
      setSourceSaveStatus('error')
      setSourceSaveError(e instanceof Error ? e.message : String(e))
    }
  }

  const canStartBroadcast =
    capturing && (broadcast.status === 'disconnected' || broadcast.status === 'error')
  const canStopBroadcast =
    broadcast.status === 'connecting' ||
    broadcast.status === 'connected' ||
    broadcast.status === 'publishing' ||
    broadcast.status === 'live'

  // Badge de statut du header. live = ON AIR, sinon connexion/erreur/hors ligne.
  const statusKey =
    broadcast.status === 'live'
      ? 'live'
      : broadcast.status === 'error'
        ? 'error'
        : broadcast.status === 'disconnected'
          ? 'offline'
          : 'connecting'
  const statusInfo = STATUS_INFO[statusKey]

  return (
    <main className="cr cr-page">
      <header className="cr-header">
        <div className="cr-brand">
          <span className="cr-brand__title">CONTROL ROOM</span>
          <span className="cr-brand__sub">RADIO BLACKHOLE · PERFORMER</span>
        </div>
        <span className="cr-badge" style={{ color: statusInfo.text }}>
          <span className="cr-badge__dot" style={{ background: statusInfo.dot, boxShadow: statusInfo.glow === 'transparent' ? 'none' : `0 0 8px ${statusInfo.glow}` }} />
          {statusInfo.label}
        </span>
        <a href="/" target="_blank" rel="noopener noreferrer" className="cr-link">
          Page publique ↗
        </a>
      </header>

      <StreamSourcePanel
        activeSource={streamSource.state.activeSource}
        loading={streamSource.loading}
        error={streamSource.error}
        updatedAt={streamSource.state.updatedAt}
        saveStatus={sourceSaveStatus}
        saveError={sourceSaveError}
        icecastAvailable={ICECAST_STREAM_URL.length > 0}
        liveKitStatus={broadcast.status}
        onChange={(source) => void handleStreamSourceChange(source)}
      />

      <div className="cr-grid">
        {/* Colonne gauche — Chaîne audio */}
        <div className="cr-col">
          <Card step="1" title="Autorisation">
            {permission === 'unsupported' && (
              <p className="cr-error">API mediaDevices indisponible dans ce navigateur.</p>
            )}
            {permission === 'idle' && (
              <button type="button" onClick={handleAuthorize} className="cr-btn--primary">
                Autoriser l’audio
              </button>
            )}
            {permission === 'requesting' && <p className="cr-muted">Demande de permission…</p>}
            {permission === 'granted' && <p className="cr-ok">✅ Permission accordée</p>}
            {permission === 'denied' && (
              <>
                <p className="cr-error">❌ {permError ?? 'Permission refusée.'}</p>
                <button type="button" onClick={handleAuthorize}>Réessayer</button>
              </>
            )}
          </Card>

          {permission === 'granted' && (
            <Card step="2" title="Source audio">
              <AudioDeviceSelect
                devices={devices}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRefresh={refresh}
              />
            </Card>
          )}

          {permission === 'granted' && (
            <Card step="3" title="Capture locale">
              <div className="cr-row">
                <button type="button" onClick={handleStartCapture} disabled={!selectedId} className="cr-btn--primary">
                  Démarrer la capture
                </button>
                {capturing && (
                  <button type="button" onClick={handleStopCapture} className="cr-btn--danger">
                    Arrêter la capture
                  </button>
                )}
              </div>
              <p className="cr-muted">
                État : {capture.status}
                {capture.deviceLabel ? ` · ${capture.deviceLabel}` : ''}
              </p>
              {capture.error && <p className="cr-error">❌ {capture.error}</p>}
              {capturing && (
                <>
                  <h3 className="cr-h3">Niveau source</h3>
                  <AudioMeter stream={capture.stream} />
                </>
              )}
            </Card>
          )}

          {permission === 'granted' && (
            <Card step="4" title="Diffusion LiveKit">
              {streamSource.state.activeSource === 'icecast' && (
                <p className="cr-tip cr-tip--warn">
                  LiveKit peut rester prêt pour les directs mobiles, mais la source actuellement publiée
                  aux auditeurs est Icecast.
                </p>
              )}
              {capturing && capture.deviceLabel && (
                <p className="cr-muted">Source active : {capture.deviceLabel}</p>
              )}
              {capturing && capture.deviceLabel && looksLikeBuiltInMic(capture.deviceLabel) && (
                <p className="cr-tip">
                  Cette source semble être un micro. Pour diffuser Ableton, sélectionne une entrée
                  virtuelle comme BlackHole ou Loopback.
                </p>
              )}
              {capturing && (
                <div style={{ marginBottom: 12 }}>
                  <label className="cr-label" htmlFor="master-volume">
                    Volume master : {masterVolume} %
                  </label>
                  <input
                    id="master-volume"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={masterVolume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="cr-range"
                  />
                  <p className="cr-tip">
                    0 % = mute du broadcast · 100 % = niveau original. Réglable en direct pendant la
                    diffusion.
                  </p>
                </div>
              )}
              {capturing && (
                <p className="cr-muted">
                  Mot de passe performer déverrouillé (validé côté serveur). Requis pour démarrer
                  la diffusion.
                </p>
              )}
              <div className="cr-row">
                <button
                  type="button"
                  onClick={() => void broadcast.start(myIdentity, masterVolume, performerPassword)}
                  disabled={!canStartBroadcast}
                  className="cr-btn--primary"
                >
                  Démarrer la diffusion
                </button>
                {canStopBroadcast && (
                  <button type="button" onClick={() => void broadcast.stop()} className="cr-btn--danger">
                    Arrêter la diffusion
                  </button>
                )}
              </div>
              <p className="cr-muted">
                Broadcast : {broadcast.status}
                {broadcast.roomName ? ` · room : ${broadcast.roomName}` : ''}
                {broadcast.identity ? ` · identity : ${broadcast.identity}` : ''}
                {broadcast.publicationName ? ` · track : ${broadcast.publicationName}` : ''}
              </p>
              {postFaderStream && (
                <>
                  <h3 className="cr-h3">Niveau envoyé aux auditeurs</h3>
                  <AudioMeter stream={postFaderStream} />
                </>
              )}
              {broadcast.error && <p className="cr-error">❌ {broadcast.error}</p>}
              {!capturing && <p className="cr-muted">Démarre la capture locale avant la diffusion.</p>}
            </Card>
          )}
        </div>

        {/* Colonne droite — Message & affichage */}
        <div className="cr-col">
          <RadioMessageForm performerPassword={performerPassword} />
        </div>
      </div>

      {/* Réglages techniques repliés : diagnostic + debug + test token + config-check.
          Outils cachés visuellement, logique intacte. */}
      <details className="cr-tech">
        <summary className="cr-tech__summary">Réglages techniques — diagnostic & debug</summary>
        <div className="cr-tech__body">
          <div>
            <h3 className="cr-tech__h3">Diagnostic</h3>
            <ul className="cr-diag">
              <li>Capture locale : {capturing ? 'active' : 'inactive'}</li>
              <li>Device sélectionné : {capture.deviceLabel ?? devices.find((d) => d.deviceId === selectedId)?.label ?? '—'}</li>
              <li>Broadcast : {broadcast.status === 'live' ? 'live' : 'offline'}</li>
              <li>Room : {broadcast.roomName || '—'}</li>
              <li>Identity (session) : {myIdentity}</li>
              <li>Identity broadcast : {broadcast.identity || '—'}</li>
              <li>Track publiée : {broadcast.publicationName ?? '—'}</li>
            </ul>
          </div>
          <div>
            <h3 className="cr-tech__h3">Debug</h3>
            <button type="button" onClick={testToken}>Test token performer</button>
            <p className="cr-token-status" style={{ color: tokenOk === false ? cr.err : tokenOk === true ? cr.ok : undefined }}>
              {tokenStatus}
            </p>
            <ConfigCheckButton />
          </div>
        </div>
      </details>

      <p className="cr-home-row">
        <a href="/" className="cr-home-link">← Retour à la radio</a>
      </p>
    </main>
  )
}

function formatUpdatedAt(updatedAt: string): string {
  if (!updatedAt) return '—'
  const d = new Date(updatedAt)
  if (Number.isNaN(d.getTime())) return updatedAt
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
}

function StreamSourcePanel({
  activeSource,
  loading,
  error,
  updatedAt,
  saveStatus,
  saveError,
  icecastAvailable,
  liveKitStatus,
  onChange,
}: {
  activeSource: StreamSource
  loading: boolean
  error: string | null
  updatedAt: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  icecastAvailable: boolean
  liveKitStatus: string
  onChange: (source: StreamSource) => void
}) {
  const statusText =
    saveStatus === 'saving'
      ? 'saving'
      : saveStatus === 'saved'
        ? 'saved'
        : saveStatus === 'error'
          ? 'error'
          : 'idle'
  return (
    <section className="cr-card cr-source-panel">
      <div className="cr-source-panel__head">
        <h2 className="cr-source-panel__title">MODE DE DIFFUSION</h2>
        <span className="cr-source-panel__current">
          Publié : {activeSource === 'icecast' ? 'STUDIO · ICECAST' : 'MOBILE · LIVEKIT'}
        </span>
      </div>
      <div className="cr-source-choices" role="group" aria-label="Mode de diffusion">
        <button
          type="button"
          className="cr-source-choice"
          data-active={activeSource === 'icecast'}
          disabled={!icecastAvailable || saveStatus === 'saving'}
          aria-pressed={activeSource === 'icecast'}
          onClick={() => onChange('icecast')}
        >
          <span>Studio maison — Icecast</span>
          <small>Ableton → BlackHole → BUTT → Icecast sur le Mac mini</small>
          {!icecastAvailable && <em>Indisponible : VITE_ICECAST_STREAM_URL absent</em>}
        </button>
        <button
          type="button"
          className="cr-source-choice"
          data-active={activeSource === 'livekit'}
          disabled={saveStatus === 'saving'}
          aria-pressed={activeSource === 'livekit'}
          onClick={() => onChange('livekit')}
        >
          <span>Émission mobile — LiveKit</span>
          <small>Micro ou carte son depuis le navigateur, adapté aux directs mobiles</small>
        </button>
      </div>
      <div className="cr-source-meta">
        <span>État API : {loading ? 'loading' : error ? 'dernière valeur valide' : 'ok'}</span>
        <span>Sauvegarde : {statusText}</span>
        <span>Dernière modification : {formatUpdatedAt(updatedAt)}</span>
        <span>LiveKit performer : {liveKitStatus}</span>
      </div>
      <p className="cr-tip">
        Changer la source ne démarre et n’arrête pas automatiquement BUTT, Icecast ou une
        publication LiveKit.
      </p>
      {saveError && <p className="cr-error">❌ {saveError}</p>}
      {error && <p className="cr-tip cr-tip--warn">Lecture source impossible : dernière valeur valide conservée.</p>}
    </section>
  )
}

// Statut broadcast du header : ON AIR / CONNEXION / ERREUR / HORS LIGNE.
const STATUS_INFO = {
  live: { label: 'ON AIR', dot: cr.live, text: cr.live, glow: 'rgba(239,68,68,.7)' },
  connecting: { label: 'CONNEXION', dot: cr.warn, text: cr.warn, glow: 'rgba(245,158,11,.5)' },
  error: { label: 'ERREUR', dot: cr.live, text: cr.err, glow: 'rgba(239,68,68,.4)' },
  offline: { label: 'HORS LIGNE', dot: cr.idle, text: cr.textDim, glow: 'transparent' },
} as const

// Card sombre de section audio. ponytail: helper local DRY (4 cartes chaîne).
function Card({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <section className="cr-card">
      <h2 className="cr-card__title">
        <span className="cr-card__step">{step}</span> {title}
      </h2>
      {children}
    </section>
  )
}
