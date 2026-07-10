import { useCallback, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { fetchToken } from '../api/token'
import { isMediaDevicesSupported, looksLikeBuiltInMic, requestAudioPermission } from '../audio/mediaDevices'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { useLocalAudioCapture } from '../hooks/useLocalAudioCapture'
import { useLiveKitBroadcast } from '../hooks/useLiveKitBroadcast'
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
    <main className="cr" style={mainStyle}>
      <header style={headerStyle}>
        <div style={brandStyle}>
          <span style={brandTitleStyle}>CONTROL ROOM</span>
          <span style={brandSubStyle}>RADIO BLACKHOLE · PERFORMER</span>
        </div>
        <span style={{ ...badgeStyle, color: statusInfo.text }}>
          <span style={{ ...dotStyle, background: statusInfo.dot, boxShadow: statusInfo.glow === 'transparent' ? 'none' : `0 0 8px ${statusInfo.glow}` }} />
          {statusInfo.label}
        </span>
        <a href="/" target="_blank" rel="noopener noreferrer" style={publicLinkStyle}>
          Page publique ↗
        </a>
      </header>

      <div className="cr-grid">
        {/* Colonne gauche — Chaîne audio */}
        <div style={colStyle}>
          <Card step="1" title="Autorisation">
            {permission === 'unsupported' && (
              <p style={errorStyle}>API mediaDevices indisponible dans ce navigateur.</p>
            )}
            {permission === 'idle' && (
              <button type="button" onClick={handleAuthorize} style={btnPrimary}>
                Autoriser l’audio
              </button>
            )}
            {permission === 'requesting' && <p style={mutedStyle}>Demande de permission…</p>}
            {permission === 'granted' && <p style={okStyle}>✅ Permission accordée</p>}
            {permission === 'denied' && (
              <>
                <p style={errorStyle}>❌ {permError ?? 'Permission refusée.'}</p>
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
              <div style={rowStyle}>
                <button type="button" onClick={handleStartCapture} disabled={!selectedId} style={btnPrimary}>
                  Démarrer la capture
                </button>
                {capturing && (
                  <button type="button" onClick={handleStopCapture} style={btnDanger}>
                    Arrêter la capture
                  </button>
                )}
              </div>
              <p style={mutedStyle}>
                État : {capture.status}
                {capture.deviceLabel ? ` · ${capture.deviceLabel}` : ''}
              </p>
              {capture.error && <p style={errorStyle}>❌ {capture.error}</p>}
              {capturing && (
                <>
                  <h3 style={h3Style}>Niveau source</h3>
                  <AudioMeter stream={capture.stream} />
                </>
              )}
            </Card>
          )}

          {permission === 'granted' && (
            <Card step="4" title="Diffusion LiveKit">
              {capturing && capture.deviceLabel && (
                <p style={mutedStyle}>Source active : {capture.deviceLabel}</p>
              )}
              {capturing && capture.deviceLabel && looksLikeBuiltInMic(capture.deviceLabel) && (
                <p style={tipStyle}>
                  Cette source semble être un micro. Pour diffuser Ableton, sélectionne une entrée
                  virtuelle comme BlackHole ou Loopback.
                </p>
              )}
              {capturing && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle} htmlFor="master-volume">
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
                    style={rangeStyle}
                  />
                  <p style={tipStyle}>
                    0 % = mute du broadcast · 100 % = niveau original. Réglable en direct pendant la
                    diffusion.
                  </p>
                </div>
              )}
              {capturing && (
                <p style={mutedStyle}>
                  Mot de passe performer déverrouillé (validé côté serveur). Requis pour démarrer
                  la diffusion.
                </p>
              )}
              <div style={rowStyle}>
                <button
                  type="button"
                  onClick={() => void broadcast.start(myIdentity, masterVolume, performerPassword)}
                  disabled={!canStartBroadcast}
                  style={btnPrimary}
                >
                  Démarrer la diffusion
                </button>
                {canStopBroadcast && (
                  <button type="button" onClick={() => void broadcast.stop()} style={btnDanger}>
                    Arrêter la diffusion
                  </button>
                )}
              </div>
              <p style={mutedStyle}>
                Broadcast : {broadcast.status}
                {broadcast.roomName ? ` · room : ${broadcast.roomName}` : ''}
                {broadcast.identity ? ` · identity : ${broadcast.identity}` : ''}
                {broadcast.publicationName ? ` · track : ${broadcast.publicationName}` : ''}
              </p>
              {postFaderStream && (
                <>
                  <h3 style={h3Style}>Niveau envoyé aux auditeurs</h3>
                  <AudioMeter stream={postFaderStream} />
                </>
              )}
              {broadcast.error && <p style={errorStyle}>❌ {broadcast.error}</p>}
              {!capturing && <p style={mutedStyle}>Démarre la capture locale avant la diffusion.</p>}
            </Card>
          )}
        </div>

        {/* Colonne droite — Message & affichage */}
        <div style={colStyle}>
          <RadioMessageForm performerPassword={performerPassword} />
        </div>
      </div>

      {/* Réglages techniques repliés : diagnostic + debug + test token + config-check.
          Outils cachés visuellement, logique intacte. */}
      <details style={techDetailsStyle}>
        <summary style={techSummaryStyle}>Réglages techniques — diagnostic & debug</summary>
        <div style={techBodyStyle}>
          <div>
            <h3 style={techH3Style}>Diagnostic</h3>
            <ul style={diagStyle}>
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
            <h3 style={techH3Style}>Debug</h3>
            <button type="button" onClick={testToken}>Test token performer</button>
            <p style={{ color: tokenOk === false ? cr.err : tokenOk === true ? cr.ok : undefined, margin: '8px 0 0', fontSize: 13, fontFamily: cr.mono, wordBreak: 'break-all' }}>
              {tokenStatus}
            </p>
            <ConfigCheckButton />
          </div>
        </div>
      </details>

      <p style={homeRowStyle}>
        <a href="/" style={homeLinkStyle}>← Retour à la radio</a>
      </p>
    </main>
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
    <section style={cardStyle}>
      <h2 style={cardTitleStyle}>
        <span style={cardStepStyle}>{step}</span> {title}
      </h2>
      {children}
    </section>
  )
}

const mainStyle: CSSProperties = {
  background: cr.bgPage,
  color: cr.text,
  fontFamily: cr.mono,
  margin: '0 auto',
  width: '100%',
  maxWidth: 1180,
  minHeight: '100svh',
  padding: '24px 20px 40px',
}
const headerStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  marginBottom: 20,
  paddingBottom: 16,
  borderBottom: `1px solid ${cr.border}`,
}
const brandStyle: CSSProperties = { display: 'flex', flexDirection: 'column', lineHeight: 1.1 }
const brandTitleStyle: CSSProperties = {
  fontFamily: cr.mono,
  fontSize: 18,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: cr.text,
  fontWeight: 600,
}
const brandSubStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: cr.accent,
  marginTop: 2,
}
const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: cr.mono,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase',
  padding: '5px 10px',
  border: `1px solid ${cr.borderStrong}`,
  borderRadius: 4,
  background: cr.surfaceSunken,
}
const dotStyle: CSSProperties = { width: 8, height: 8, borderRadius: '50%' }
const publicLinkStyle: CSSProperties = {
  marginLeft: 'auto',
  fontFamily: cr.mono,
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.accent,
  textDecoration: 'none',
  border: `1px solid ${cr.borderStrong}`,
  padding: '6px 12px',
  borderRadius: 4,
  background: cr.surfaceSunken,
}
const colStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }
const cardStyle: CSSProperties = {
  background: cr.surface,
  border: `1px solid ${cr.border}`,
  borderRadius: 8,
  padding: 16,
}
const cardTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  fontFamily: cr.mono,
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: cr.textMuted,
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  fontWeight: 600,
}
const cardStepStyle: CSSProperties = { color: cr.accent, fontWeight: 700 }
const h3Style: CSSProperties = {
  fontSize: 11,
  margin: '10px 0 4px',
  fontFamily: cr.mono,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.textDim,
  fontWeight: 600,
}
const rowStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
const btnPrimary: CSSProperties = { background: cr.accent, color: '#0e1117', border: `1px solid ${cr.accentDeep}` }
const btnDanger: CSSProperties = { color: cr.err, borderColor: 'rgba(239,68,68,.45)' }
const okStyle: CSSProperties = { color: cr.ok, margin: 0, fontSize: 13 }
const errorStyle: CSSProperties = { color: cr.err, margin: '0 0 8px', fontSize: 13 }
const mutedStyle: CSSProperties = { color: cr.textMuted, fontSize: 13, lineHeight: 1.5, margin: '6px 0' }
const tipStyle: CSSProperties = { color: cr.textDim, fontSize: 12, margin: '6px 0 12px', lineHeight: 1.5 }
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.textMuted,
  marginBottom: 6,
}
const rangeStyle: CSSProperties = { width: '100%', accentColor: cr.accent }
const techDetailsStyle: CSSProperties = {
  marginTop: 16,
  background: cr.surfaceSunken,
  border: `1px solid ${cr.border}`,
  borderRadius: 8,
  padding: '10px 14px',
}
const techSummaryStyle: CSSProperties = {
  cursor: 'pointer',
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: cr.textDim,
  fontFamily: cr.mono,
  fontWeight: 600,
}
const techBodyStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }
const techH3Style: CSSProperties = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.textMuted,
  margin: '0 0 6px',
  fontFamily: cr.mono,
  fontWeight: 600,
}
const diagStyle: CSSProperties = { margin: 0, paddingLeft: 18, fontSize: 13, color: cr.textMuted, lineHeight: 1.7, fontFamily: cr.mono }
const homeRowStyle: CSSProperties = { textAlign: 'center', marginTop: 24 }
const homeLinkStyle: CSSProperties = {
  fontFamily: 'var(--mono, ui-monospace, Consolas, monospace)',
  fontSize: 13,
  letterSpacing: 2,
  color: '#f5d76b',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: '1px solid #2a2d36',
  padding: '6px 14px',
  borderRadius: 4,
  background: '#14161e',
  opacity: 0.85,
}