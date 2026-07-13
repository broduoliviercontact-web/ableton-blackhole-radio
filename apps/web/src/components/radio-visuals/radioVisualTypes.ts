import type { BroadcastInput, BroadcastMessage, Visualization } from '../../api/broadcastMessage'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import type { ResolvedVisual } from '../splitflap/visual'

export type RadioVisualStatus = 'live' | 'connecting' | 'offline' | 'preview'
export type RadioMessage = BroadcastInput | BroadcastMessage | null

export interface RadioVisualData {
  brand: string
  title: string
  secondary: string
  note: string
  ticker: string
  type: string
  updatedAt: string | null
}

export interface RadioMetrics {
  waveform: Float32Array
  leftWaveform: Float32Array
  rightWaveform: Float32Array
  spectrum: Uint8Array
  rms: number
  peak: number
  bass: number
  mid: number
  treble: number
  centroid: number
  stereoWidth: number
  correlation: number
  active: boolean
  simulated: boolean
  reducedMotion: boolean
  now: number
  revision: number
}

export interface RadioVisualProps {
  kind: Exclude<Visualization, 'split-flap'>
  data: RadioVisualData
  visual: ResolvedVisual
  status: RadioVisualStatus
  metrics: RadioMetrics
  preview?: boolean
}

export interface RadioVisualSource {
  kind: Exclude<Visualization, 'split-flap'>
  message: RadioMessage
  visual: ResolvedVisual
  status: RadioVisualStatus
  analyser?: ListenerAudioAnalyser
  preview?: boolean
}
