import type { RadioVisualSource } from './radioVisualTypes'
import { useRadioMetrics } from './useRadioMetrics'
import { toRadioVisualData } from './visualData'
import { CrtTerminalVisual } from './crt/CrtTerminalVisual'
import { AsciiWaveVisual } from './ascii/AsciiWaveVisual'
import { SignalScopeVisual } from './scope/SignalScopeVisual'
import { DotMatrixVisual, PacketStreamVisual, TeletextVisual } from './engines/InformationVisuals'
import { AnalogPersistenceVisual, SpectrumWaterfallVisual, StereoOrbitVisual } from './engines/AudioVisuals'
import { ConstellationRadioVisual, EventHorizonVisual, PixelMosaicVisual, RadarTransmissionVisual } from './engines/GenerativeVisuals'
import { KineticTypeVisual, TapeMachineVisual } from './engines/EditorialVisuals'
import './radio-visuals.css'

/**
 * Routeur strict des moteurs non Split-Flap. Le Split-Flap reste rendu dans
 * RadioPage/SplitFlapPreview afin de preserver les comportements HotFX existants.
 */
export function RadioDataVisual({ kind, message, visual, status, analyser, preview = false }: RadioVisualSource) {
  const data = toRadioVisualData(message)
  const metrics = useRadioMetrics(analyser, preview)
  const props = { kind, data, visual, status, metrics, preview }
  switch (kind) {
    case 'crt-terminal': return <CrtTerminalVisual {...props} />
    case 'ascii-wave': return <AsciiWaveVisual {...props} />
    case 'signal-scope': return <SignalScopeVisual {...props} />
    case 'teletext': return <TeletextVisual {...props} />
    case 'dot-matrix': return <DotMatrixVisual {...props} />
    case 'packet-stream': return <PacketStreamVisual {...props} />
    case 'spectrum-waterfall': return <SpectrumWaterfallVisual {...props} />
    case 'stereo-orbit': return <StereoOrbitVisual {...props} />
    case 'analog-persistence': return <AnalogPersistenceVisual {...props} />
    case 'event-horizon': return <EventHorizonVisual {...props} />
    case 'radar-transmission': return <RadarTransmissionVisual {...props} />
    case 'constellation-radio': return <ConstellationRadioVisual {...props} />
    case 'pixel-mosaic': return <PixelMosaicVisual {...props} />
    case 'kinetic-type': return <KineticTypeVisual {...props} />
    case 'tape-machine': return <TapeMachineVisual {...props} />
  }
}
