import { lazy, Suspense } from 'react'
import type { CSSProperties } from 'react'

// Code-split (US-4.2) : chaque page (et ses deps LiveKit) dans son propre chunk.
const Performer = lazy(() =>
  import('./pages/Performer').then((m) => ({ default: m.Performer })),
)
const Listen = lazy(() => import('./pages/Listen').then((m) => ({ default: m.Listen })))

// Routage par pathname — pas de react-router pour 2 routes (ponytail).
export default function App() {
  const path = window.location.pathname
  const onListen = path.startsWith('/listen')
  const page = onListen ? <Listen /> : <Performer />

  return (
    <>
      <nav style={navStyle}>
        <a href="/performer" style={{ fontWeight: !onListen ? 'bold' : undefined }}>
          Performer
        </a>
        <a href="/listen" style={{ fontWeight: onListen ? 'bold' : undefined }}>
          Listener
        </a>
      </nav>
      <Suspense fallback={<p style={fallbackStyle}>Chargement…</p>}>{page}</Suspense>
    </>
  )
}

const navStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: 12,
  fontFamily: 'system-ui, sans-serif',
}
const fallbackStyle: CSSProperties = { padding: 24, fontFamily: 'system-ui, sans-serif' }