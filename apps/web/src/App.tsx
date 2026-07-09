import { lazy, Suspense } from 'react'
import type { CSSProperties } from 'react'

// Code-split : la page publique (RadioPage) et le gate performer sont des
// chunks séparés. /performer reste chargé derrière PerformerGate.
const RadioPage = lazy(() => import('./pages/RadioPage').then((m) => ({ default: m.RadioPage })))
const PerformerGate = lazy(() =>
  import('./components/PerformerGate').then((m) => ({ default: m.PerformerGate })),
)

// Routage par pathname — pas de react-router (ponytail).
// La page publique est la page radio split-flap : "/" et "/listen" → RadioPage.
// "/performer" est caché (URL directe uniquement) et protégé par PerformerGate.
export default function App() {
  const path = window.location.pathname
  const onPerformer = path.startsWith('/performer')
  const page = onPerformer ? <PerformerGate /> : <RadioPage />

  return (
    <Suspense fallback={<p style={fallbackStyle}>Chargement…</p>}>{page}</Suspense>
  )
}

const fallbackStyle: CSSProperties = { padding: 24, fontFamily: 'system-ui, sans-serif' }