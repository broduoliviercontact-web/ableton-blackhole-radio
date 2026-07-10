import { useState } from 'react'
import type { CSSProperties } from 'react'
import { FAKE_CONFIG_HINT, fetchConfigCheck, type ConfigCheckResult } from '../api/config'
import { cr } from './controlRoom'

export function ConfigCheckButton() {
  const [result, setResult] = useState<ConfigCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function check() {
    setLoading(true)
    setError(null)
    try {
      setResult(await fetchConfigCheck())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={wrapStyle}>
      <button type="button" onClick={check} disabled={loading} style={btnStyle}>
        Vérifier config serveur
      </button>
      {error && <p style={errorStyle}>❌ {error}</p>}
      {result && (
        <ul style={listStyle}>
          <li>LiveKit URL configurée : {result.livekitUrlConfigured ? 'oui' : 'non'}</li>
          <li>API key configurée : {result.livekitKeyConfigured ? 'oui' : 'non'}</li>
          <li>API secret configuré : {result.livekitSecretConfigured ? 'oui' : 'non'}</li>
          <li>URL factice détectée : {result.livekitUrlLooksFake ? 'oui' : 'non'}</li>
        </ul>
      )}
      {result?.livekitUrlLooksFake && <p style={warnStyle}>{FAKE_CONFIG_HINT}</p>}
    </div>
  )
}

const wrapStyle: CSSProperties = { marginTop: 8 }
const btnStyle: CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  fontFamily: cr.mono,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.text,
  background: cr.surfaceRaised,
  border: `1px solid ${cr.borderStrong}`,
  borderRadius: 4,
  cursor: 'pointer',
}
const listStyle: CSSProperties = { margin: '8px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: cr.textMuted, fontFamily: cr.mono }
const errorStyle: CSSProperties = { color: cr.err, margin: '8px 0 0', fontSize: 13 }
const warnStyle: CSSProperties = { color: cr.warn, margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }