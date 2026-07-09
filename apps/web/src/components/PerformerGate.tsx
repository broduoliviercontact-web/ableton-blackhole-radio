import { lazy, Suspense, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { checkPerformerPassword } from '../api/performerAuth'

// Performer n'est chargé qu'après validation du mot de passe (code-split + ne
// rend pas le contenu performer avant auth).
const Performer = lazy(() =>
  import('../pages/Performer').then((m) => ({ default: m.Performer })),
)

type GateStatus = 'idle' | 'checking' | 'error'

/**
 * Écran de mot de passe avant la page Performer. Le mot de passe validé reste
 * uniquement en state React (jamais localStorage/URL) et est passé à Performer
 * pour Start broadcast et Test token. Au refresh, on redemande le mot de passe.
 *
 * Sécurité : ce gate cache l'UI performer ; la vraie sécurité reste le contrôle
 * backend des tokens canPublish (POST /api/token exige un mot de passe valide).
 */
export function PerformerGate() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<GateStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [validated, setValidated] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || status === 'checking') return
    setStatus('checking')
    setError(null)
    try {
      await checkPerformerPassword(password)
      setValidated(password)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (validated !== null) {
    return (
      <Suspense fallback={<p style={fallbackStyle}>Chargement…</p>}>
        <Performer performerPassword={validated} />
      </Suspense>
    )
  }

  return (
    <main style={mainStyle}>
      <h1 style={h1Style}>Performer</h1>
      <p style={mutedStyle}>Accès réservé. Saisis le mot de passe performer.</p>
      <form onSubmit={submit} style={formStyle}>
        <label style={labelStyle} htmlFor="performer-gate-password">
          Mot de passe performer
        </label>
        <input
          id="performer-gate-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          style={inputStyle}
        />
        <button type="submit" disabled={!password || status === 'checking'}>
          {status === 'checking' ? 'Vérification…' : 'Déverrouiller'}
        </button>
      </form>
      {status === 'error' && error && <p style={errorStyle}>❌ {error}</p>}
    </main>
  )
}

const mainStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 420,
  margin: '0 auto',
  padding: 24,
}
const h1Style: CSSProperties = { margin: '0 0 4px' }
const mutedStyle: CSSProperties = { color: '#6b7280', marginTop: 0 }
const formStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }
const labelStyle: CSSProperties = { fontWeight: 600, fontSize: 14 }
const inputStyle: CSSProperties = { padding: '8px 10px', fontSize: 16 }
const errorStyle: CSSProperties = { color: 'crimson', marginTop: 8 }
const fallbackStyle: CSSProperties = { padding: 24, fontFamily: 'system-ui, sans-serif' }