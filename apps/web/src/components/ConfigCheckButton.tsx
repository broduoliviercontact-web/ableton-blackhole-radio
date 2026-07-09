import { useState } from 'react'
import type { CSSProperties } from 'react'
import { FAKE_CONFIG_HINT, fetchConfigCheck, type ConfigCheckResult } from '../api/config'

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
      <button type="button" onClick={check} disabled={loading}>
        Check server config
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
const listStyle: CSSProperties = { margin: '8px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }
const errorStyle: CSSProperties = { color: 'crimson', margin: '8px 0 0' }
const warnStyle: CSSProperties = { color: '#b45309', margin: '8px 0 0', fontSize: 14 }