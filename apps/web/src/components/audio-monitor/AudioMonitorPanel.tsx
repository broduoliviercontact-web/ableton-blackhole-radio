import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import { useResizablePanel, PANEL_MIN_HEIGHT, PANEL_MAX_HEIGHT } from '../../hooks/useResizablePanel'
import { VuMeter } from './VuMeter'
import { DbMeter } from './DbMeter'
import { SpectrumAnalyzer } from './SpectrumAnalyzer'
import { Spectrogram } from './Spectrogram'
import { StereoMeter } from './StereoMeter'
import { SpectralInfo } from './SpectralInfo'

type Tab = 'vu' | 'db' | 'spectrum' | 'spectrogram' | 'stereo' | 'spectral'

interface Props {
  analyser: ListenerAudioAnalyser
  active: boolean
  defaultOpen?: boolean
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'vu', label: 'VU' },
  { id: 'db', label: 'dB' },
  { id: 'spectrum', label: 'Spectrum' },
  { id: 'spectrogram', label: 'Spectrogram' },
  { id: 'stereo', label: 'Stereo' },
  { id: 'spectral', label: 'Spectral' },
]

/**
 * Panneau « AUDIO MONITOR » côté listener : 6 visualisations temps réel sur le
 * flux LiveKit (sans l'altérer). Repliable (Masquer/Afficher) ; rAF stoppé quand
 * fermé ou onglet caché (rAF ne tourne pas en arrière-plan). prefers-reduced-motion
 * → FPS réduit. Esthétique machine (noir/anthracite, jaune sale, orange discret).
 */
export function AudioMonitorPanel({ analyser, active, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [tab, setTab] = useState<Tab>('vu')
  const [reduced, setReduced] = useState(false)
  const { height, panelRef, startResize, onPointerMove, endResize, onKey, setPresetHeight } =
    useResizablePanel()
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
  }, [])

  // FPS : réduit si reduced-motion ; spectrogram plus lent par nature.
  const fps = reduced ? 8 : 30
  const heavyFps = reduced ? 6 : 24
  const status = active ? 'ANALYZING' : 'EN ATTENTE AUDIO'

  return (
    <section ref={panelRef} style={open ? { ...panel, height, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : panel}>
      <header style={headerRow}>
        <span style={title}>AUDIO MONITOR</span>
        <span style={statusRow}>
          <span style={active ? dotLive : dotIdle} />
          {status}
        </span>
        <button type="button" onClick={() => setOpen((o) => !o)} style={toggleBtn}>
          {open ? 'Masquer ▾' : 'Afficher ▸'}
        </button>
      </header>
      {open && (
        <>
          <nav style={tabs}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                style={tab === t.id ? tabActive : tabStyle}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div style={stage}>
            {tab === 'vu' && <VuMeter analyser={analyser} active={active} maxFps={fps} />}
            {tab === 'db' && <DbMeter analyser={analyser} active={active} maxFps={fps} />}
            {tab === 'spectrum' && <SpectrumAnalyzer analyser={analyser} active={active} />}
            {tab === 'spectrogram' && <Spectrogram analyser={analyser} active={active} maxFps={heavyFps} />}
            {tab === 'stereo' && <StereoMeter analyser={analyser} active={active} maxFps={fps} />}
            {tab === 'spectral' && <SpectralInfo analyser={analyser} active={active} maxFps={fps} />}
          </div>
          <p style={note}>
            Monitoring local navigateur — n’affecte pas le flux. ≠ meter LUFS broadcast.
          </p>
          <div style={resizeBar}>
            <div style={presets}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPresetHeight(p.h)}
                  style={height === p.h ? presetActive : presetBtn}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Redimensionner le panneau Audio Monitor"
              aria-orientation="vertical"
              aria-valuemin={PANEL_MIN_HEIGHT}
              aria-valuemax={PANEL_MAX_HEIGHT}
              aria-valuenow={height}
              onPointerDown={startResize}
              onPointerMove={onPointerMove}
              onPointerUp={endResize}
              onPointerCancel={endResize}
              onKeyDown={onKey}
              style={handle}
            >
              <span style={grip} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}

const PRESETS: Array<{ label: string; h: number }> = [
  { label: 'Compact', h: 260 },
  { label: 'Normal', h: 360 },
  { label: 'Large', h: 560 },
]

const panel: CSSProperties = {
  marginTop: 10,
  padding: 8,
  background: '#0e1117',
  border: '1px solid #23262f',
  borderRadius: 4,
  fontFamily: 'var(--mono, ui-monospace, Consolas, monospace)',
}
const headerRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const title: CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#f5d76b' }
const statusRow: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase' }
const dotLive: CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: '#f5d76b', display: 'inline-block' }
const dotIdle: CSSProperties = { width: 8, height: 8, borderRadius: '50%', background: '#3a3f4b', display: 'inline-block' }
const toggleBtn: CSSProperties = { marginLeft: 'auto', padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #2a2f3a', background: '#15181f', color: '#9ca3af' }
const tabs: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }
const tabStyle: CSSProperties = { padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #2a2f3a', background: '#15181f', color: '#6b7280' }
const tabActive: CSSProperties = { ...tabStyle, border: '1px solid var(--accent, #aa3bff)', background: 'var(--accent, #aa3bff)', color: '#0e1117' }
const stage: CSSProperties = { marginTop: 6, flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }
const note: CSSProperties = { margin: '6px 0 0', fontSize: 10, color: '#5b6473' }
const resizeBar: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 }
const presets: CSSProperties = { display: 'flex', gap: 4 }
const presetBtn: CSSProperties = { padding: '2px 8px', fontSize: 10, fontWeight: 600, cursor: 'pointer', border: '1px solid #2a2f3a', background: '#15181f', color: '#6b7280' }
const presetActive: CSSProperties = { ...presetBtn, border: '1px solid #3a3f4b', color: '#f5d76b' }
const handle: CSSProperties = { flex: '1 1 auto', maxWidth: 160, height: 14, cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #23262f', touchAction: 'none', userSelect: 'none', outline: 'none' }
const grip: CSSProperties = { width: 44, height: 4, borderRadius: 2, background: '#3a3f4b' }