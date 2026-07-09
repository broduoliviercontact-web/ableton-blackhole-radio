import { lazy, Suspense } from 'react'
import type { CSSProperties } from 'react'

// Code-split (US-4.2) : chaque page dans son propre chunk.
// /performer est chargé derrière le gate (PerformerGate lazy-load Performer).
const Listen = lazy(() => import('./pages/Listen').then((m) => ({ default: m.Listen })))
const PerformerGate = lazy(() =>
  import('./components/PerformerGate').then((m) => ({ default: m.PerformerGate })),
)

// Routage par pathname — pas de react-router (ponytail).
// La page publique est la page listener : "/" et "/listen" → Listen.
// "/performer" est caché (URL directe uniquement) et protégé par PerformerGate.
export default function App() {
  const path = window.location.pathname
  const onPerformer = path.startsWith('/performer')
  const page = onPerformer ? <PerformerGate /> : <Listen />

  return (
    <Suspense fallback={<p style={fallbackStyle}>Chargement…</p>}>{page}</Suspense>
  )
}

const fallbackStyle: CSSProperties = { padding: 24, fontFamily: 'system-ui, sans-serif' }