import { lazy, Suspense, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { checkPerformerPassword } from '../api/performerAuth'
import { cr } from './controlRoom'

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
      <Suspense fallback={<p style={fallbackStyle}>Chargement…</p>}>
        <Performer performerPassword={validated} />
      </Suspense>
    )
  }

  return (
    <main className="cr" style={mainStyle}>
      <div style={cardStyle}>
        <h1 style={h1Style}>CONTROL ROOM</h1>
        <p style={kickerStyle}>RADIO BLACKHOLE · PERFORMER</p>
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
          <button type="submit" disabled={!password || status === 'checking'} style={primaryBtnStyle}>
            {status === 'checking' ? 'Vérification…' : 'Déverrouiller'}
          </button>
        </form>
        {status === 'error' && error && <p style={errorStyle}>❌ {error}</p>}
      </div>
      <p style={homeRowStyle}>
        <a href="/" style={homeLinkStyle}>← Retour à la radio</a>
      </p>
    </main>
  )
}

const mainStyle: CSSProperties = {
  background: cr.bgPage,
  color: cr.text,
  fontFamily: cr.mono,
  margin: 0,
  padding: 24,
  minHeight: '100svh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
}
const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 380,
  background: cr.surface,
  border: `1px solid ${cr.border}`,
  borderRadius: 8,
  padding: 28,
}
const h1Style: CSSProperties = {
  margin: 0,
  fontFamily: cr.mono,
  fontSize: 22,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: cr.accent,
  fontWeight: 600,
}
const kickerStyle: CSSProperties = {
  margin: '2px 0 16px',
  fontSize: 11,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: cr.textDim,
}
const mutedStyle: CSSProperties = { color: cr.textMuted, fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }
const formStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 }
const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: cr.textMuted,
}
const inputStyle: CSSProperties = {
  padding: '10px 12px',
  fontSize: 16,
  fontFamily: cr.mono,
  color: cr.text,
  background: cr.surfaceSunken,
  border: `1px solid ${cr.borderStrong}`,
  borderRadius: 4,
}
const primaryBtnStyle: CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontFamily: cr.mono,
  color: '#0e1117',
  background: cr.accent,
  border: `1px solid ${cr.accentDeep}`,
  borderRadius: 4,
  cursor: 'pointer',
}
const errorStyle: CSSProperties = { color: cr.err, marginTop: 12, fontSize: 13 }
const fallbackStyle: CSSProperties = { padding: 24, fontFamily: cr.mono, color: cr.textMuted }
const homeRowStyle: CSSProperties = { textAlign: 'center', margin: 0 }
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