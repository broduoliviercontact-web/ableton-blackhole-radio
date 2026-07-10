import { lazy, Suspense, useState } from 'react'
import type { FormEvent } from 'react'
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
 * pour démarrer la diffusion et tester le token. Au refresh, on redemande le
 * mot de passe.
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
      <Suspense fallback={<p className="cr-gate__fallback">Chargement…</p>}>
        <Performer performerPassword={validated} />
      </Suspense>
    )
  }

  return (
    <main className="cr cr-gate">
      <div className="cr-gate__card">
        <h1 className="cr-gate__title">CONTROL ROOM</h1>
        <p className="cr-gate__kicker">RADIO BLACKHOLE · PERFORMER</p>
        <p className="cr-gate__muted">Accès réservé. Saisis le mot de passe performer.</p>
        <form onSubmit={submit} className="cr-gate__form">
          <label className="cr-gate__label" htmlFor="performer-gate-password">
            Mot de passe performer
          </label>
          <input
            id="performer-gate-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            className="cr-gate__input"
          />
          <button type="submit" disabled={!password || status === 'checking'} className="cr-gate__btn">
            {status === 'checking' ? 'Vérification…' : 'Déverrouiller'}
          </button>
        </form>
        {status === 'error' && error && <p className="cr-gate__error">❌ {error}</p>}
      </div>
      <p className="cr-gate__home-row">
        <a href="/" className="cr-home-link">← Retour à la radio</a>
      </p>
    </main>
  )
}