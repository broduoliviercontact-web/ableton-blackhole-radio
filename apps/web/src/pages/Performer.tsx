import { useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import { fetchToken } from '../api/token'
import { isMediaDevicesSupported, looksLikeBuiltInMic, requestAudioPermission } from '../audio/mediaDevices'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { useLocalAudioCapture } from '../hooks/useLocalAudioCapture'
import { useLiveKitBroadcast } from '../hooks/useLiveKitBroadcast'
import { AudioDeviceSelect } from '../components/AudioDeviceSelect'
import { AudioMeter } from '../components/AudioMeter'
import { ConfigCheckButton } from '../components/ConfigCheckButton'
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

export function Performer() {
  const supported = isMediaDevicesSupported()
  const [permission, setPermission] = useState<Permission>(supported ? 'idle' : 'unsupported')
  const [permError, setPermError] = useState<string | null>(null)

  const { devices, selectedId, setSelectedId, refresh } = useAudioDevices(permission === 'granted')
  const capture = useLocalAudioCapture()
  const broadcast = useLiveKitBroadcast(capture.stream)
  const { postFaderStream } = broadcast
  const [myIdentity] = useState(() => getOrCreateIdentity('performer'))
  const [masterVolume, setMasterVolume] = useState(100) // US-5 : fader master (défaut 100 %)

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
      const r = await fetchToken({ roomName: 'main', identity: 'performer-test', role: 'performer' })
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

  return (
    <main style={mainStyle}>
      <h1>Performer</h1>
      <p>Diffuse une entrée audio du Mac vers le web.</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Autorisation</h2>
        {permission === 'unsupported' && (
          <p style={errorStyle}>API mediaDevices indisponible dans ce navigateur.</p>
        )}
        {permission === 'idle' && (
          <button type="button" onClick={handleAuthorize}>
            Autoriser l’audio
          </button>
        )}
        {permission === 'requesting' && <p>Demande de permission…</p>}
        {permission === 'granted' && <p style={okStyle}>✅ Permission accordée</p>}
        {permission === 'denied' && (
          <>
            <p style={errorStyle}>❌ {permError ?? 'Permission refusée.'}</p>
            <button type="button" onClick={handleAuthorize}>
              Réessayer
            </button>
          </>
        )}
      </section>

      {permission === 'granted' && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Choisis la source audio</h2>
          <AudioDeviceSelect
            devices={devices}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRefresh={refresh}
          />
        </section>
      )}

      {permission === 'granted' && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>3. Capture locale</h2>
          <div style={rowStyle}>
            <button type="button" onClick={handleStartCapture} disabled={!selectedId}>
              Start local capture
            </button>
            {capturing && (
              <button type="button" onClick={handleStopCapture}>
                Stop local capture
              </button>
            )}
          </div>
          <p style={mutedStyle}>
            État : {capture.status}
            {capture.deviceLabel ? ` · device : ${capture.deviceLabel}` : ''}
          </p>
          {capture.error && <p style={errorStyle}>❌ {capture.error}</p>}
          {capturing && (
            <>
              <h3 style={h3Style}>Niveau source</h3>
              <AudioMeter stream={capture.stream} />
            </>
          )}
        </section>
      )}

      {permission === 'granted' && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Broadcast LiveKit</h2>
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
                Volume master envoyé aux auditeurs : {masterVolume} %
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
          <div style={rowStyle}>
            <button
              type="button"
              onClick={() => void broadcast.start(myIdentity, masterVolume)}
              disabled={!canStartBroadcast}
            >
              Start broadcast
            </button>
            {canStopBroadcast && (
              <button type="button" onClick={() => void broadcast.stop()}>
                Stop broadcast
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
              <h3 style={h3Style}>Niveau envoyé aux auditeurs (sortie broadcast)</h3>
              <AudioMeter stream={postFaderStream} />
            </>
          )}
          {broadcast.error && <p style={errorStyle}>❌ {broadcast.error}</p>}
          {!capturing && <p style={mutedStyle}>Démarrez la capture locale avant le broadcast.</p>}
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={h2Style}>Diagnostic</h2>
        <ul style={diagStyle}>
          <li>Capture locale : {capturing ? 'active' : 'inactive'}</li>
          <li>Device sélectionné : {capture.deviceLabel ?? devices.find((d) => d.deviceId === selectedId)?.label ?? '—'}</li>
          <li>Broadcast : {broadcast.status === 'live' ? 'live' : 'offline'}</li>
          <li>Room : {broadcast.roomName || '—'}</li>
          <li>Identity (session) : {myIdentity}</li>
          <li>Identity broadcast : {broadcast.identity || '—'}</li>
          <li>Track publiée : {broadcast.publicationName ?? '—'}</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Debug</h2>
        <button type="button" onClick={testToken}>
          Test token performer
        </button>
        <p style={{ color: tokenOk === false ? 'crimson' : tokenOk === true ? 'green' : undefined }}>
          {tokenStatus}
        </p>
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
const sectionStyle: CSSProperties = { borderTop: '1px solid #e5e7eb', marginTop: 16, paddingTop: 16 }
const h2Style: CSSProperties = { fontSize: 18, margin: '0 0 8px' }
const h3Style: CSSProperties = { fontSize: 15, margin: '12px 0 4px' }
const rowStyle: CSSProperties = { display: 'flex', gap: 8 }
const okStyle: CSSProperties = { color: 'green', margin: 0 }
const errorStyle: CSSProperties = { color: 'crimson', margin: '0 0 8px' }
const mutedStyle: CSSProperties = { color: '#6b7280', fontSize: 14 }
const diagStyle: CSSProperties = { margin: 0, paddingLeft: 20, fontSize: 14, color: '#374151', lineHeight: 1.7 }
const tipStyle: CSSProperties = { color: '#6b7280', fontSize: 13, margin: '0 0 12px' }
const labelStyle: CSSProperties = { display: 'block', fontWeight: 600, marginBottom: 4 }
const rangeStyle: CSSProperties = { width: '100%' }