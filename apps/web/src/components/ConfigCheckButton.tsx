import { useState } from 'react'
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
    <div className="cr-config-wrap">
      <button type="button" onClick={check} disabled={loading} className="cr-btn--ghost">
        Vérifier config serveur
      </button>
      {error && <p className="cr-config-error">❌ {error}</p>}
      {result && (
        <ul className="cr-config-list">
          <li>LiveKit URL configurée : {result.livekitUrlConfigured ? 'oui' : 'non'}</li>
          <li>API key configurée : {result.livekitKeyConfigured ? 'oui' : 'non'}</li>
          <li>API secret configuré : {result.livekitSecretConfigured ? 'oui' : 'non'}</li>
          <li>URL factice détectée : {result.livekitUrlLooksFake ? 'oui' : 'non'}</li>
        </ul>
      )}
      {result?.livekitUrlLooksFake && <p className="cr-config-warn">{FAKE_CONFIG_HINT}</p>}
    </div>
  )
}