import { useEffect, useRef, useState } from 'react'
import type { ListenerAudioAnalyser } from '../../audio/listenerAnalysis'
import type { RadioMetrics } from './radioVisualTypes'

const WAVEFORM_SIZE = 192
const SPECTRUM_SIZE = 128

function createMetrics(): RadioMetrics {
  return {
    waveform: new Float32Array(WAVEFORM_SIZE),
    leftWaveform: new Float32Array(WAVEFORM_SIZE),
    rightWaveform: new Float32Array(WAVEFORM_SIZE),
    spectrum: new Uint8Array(SPECTRUM_SIZE),
    rms: 0,
    peak: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    centroid: 0,
    stereoWidth: 0,
    correlation: 1,
    active: false,
    simulated: true,
    reducedMotion: false,
    now: 0,
    revision: 0,
  }
}

function average(values: Uint8Array, start: number, end: number): number {
  let total = 0
  const safeEnd = Math.max(start + 1, Math.min(values.length, end))
  for (let index = start; index < safeEnd; index += 1) total += values[index]
  return total / ((safeEnd - start) * 255)
}

function decimateByte(source: Uint8Array, target: Uint8Array): void {
  for (let index = 0; index < target.length; index += 1) {
    target[index] = source[Math.min(source.length - 1, Math.floor((index / target.length) * source.length))]
  }
}

function decimateWave(source: Uint8Array, target: Float32Array): void {
  for (let index = 0; index < target.length; index += 1) {
    target[index] = (source[Math.min(source.length - 1, Math.floor((index / target.length) * source.length))] - 128) / 128
  }
}

function simulate(metrics: RadioMetrics, elapsed: number, reducedMotion: boolean): void {
  const speed = reducedMotion ? 0.22 : 1
  for (let index = 0; index < metrics.waveform.length; index += 1) {
    const position = index / metrics.waveform.length
    const left = Math.sin(position * 18 + elapsed * 0.0027 * speed) * 0.22 + Math.sin(position * 61 - elapsed * 0.0011 * speed) * 0.08
    const right = Math.sin(position * 17 + elapsed * 0.0024 * speed + 0.8) * 0.2 + Math.sin(position * 49 + elapsed * 0.0015 * speed) * 0.07
    metrics.leftWaveform[index] = left
    metrics.rightWaveform[index] = right
    metrics.waveform[index] = (left + right) / 2
  }
  for (let index = 0; index < metrics.spectrum.length; index += 1) {
    const position = index / metrics.spectrum.length
    const ridge = Math.max(0, 1 - Math.abs(position - (0.18 + Math.sin(elapsed * 0.00045 * speed) * 0.12)) * 5)
    const shimmer = (Math.sin(index * 1.71 + elapsed * 0.003 * speed) + 1) * 0.12
    metrics.spectrum[index] = Math.round(Math.min(1, 0.08 + ridge * 0.72 + shimmer) * 255)
  }
  metrics.rms = 0.22
  metrics.peak = 0.42
  metrics.bass = 0.45
  metrics.mid = 0.28
  metrics.treble = 0.19
  metrics.centroid = 0.32
  metrics.stereoWidth = 0.3
  metrics.correlation = 0.75
}

/**
 * Snapshot audio unique pour tous les moteurs. Les tableaux sont mutables et
 * reutilises, seules les donnees scalaires declenchent un rendu a cadence bornee.
 */
export function useRadioMetrics(analyser?: ListenerAudioAnalyser, preview = false): RadioMetrics {
  const metricsRef = useRef<RadioMetrics>(createMetrics())
  const timeRef = useRef(new Uint8Array(2048))
  const leftRef = useRef(new Uint8Array(2048))
  const rightRef = useRef(new Uint8Array(2048))
  const frequencyRef = useRef(new Uint8Array(1024))
  const [, setRevision] = useState(0)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = query.matches
    const updateMotion = () => { reducedMotion = query.matches }
    query.addEventListener('change', updateMotion)
    let raf = 0
    let previous = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const maxFps = document.hidden ? 4 : reducedMotion ? 8 : 24
      if (now - previous < 1000 / maxFps) return
      previous = now
      const metrics = metricsRef.current
      const node = analyser?.mainAnalyser
      const hasAudio = Boolean(node && analyser?.active && !preview)
      metrics.active = hasAudio
      metrics.simulated = !hasAudio
      metrics.reducedMotion = reducedMotion
      metrics.now = now
      if (!hasAudio || !node) {
        simulate(metrics, now - startedAt, reducedMotion)
      } else {
        if (timeRef.current.length !== node.fftSize) timeRef.current = new Uint8Array(node.fftSize)
        if (frequencyRef.current.length !== node.frequencyBinCount) frequencyRef.current = new Uint8Array(node.frequencyBinCount)
        node.getByteTimeDomainData(timeRef.current)
        node.getByteFrequencyData(frequencyRef.current)
        decimateWave(timeRef.current, metrics.waveform)
        decimateByte(frequencyRef.current, metrics.spectrum)
        const left = analyser?.leftAnalyser
        const right = analyser?.rightAnalyser
        if (left && right) {
          if (leftRef.current.length !== left.fftSize) leftRef.current = new Uint8Array(left.fftSize)
          if (rightRef.current.length !== right.fftSize) rightRef.current = new Uint8Array(right.fftSize)
          left.getByteTimeDomainData(leftRef.current)
          right.getByteTimeDomainData(rightRef.current)
          decimateWave(leftRef.current, metrics.leftWaveform)
          decimateWave(rightRef.current, metrics.rightWaveform)
        } else {
          metrics.leftWaveform.set(metrics.waveform)
          metrics.rightWaveform.set(metrics.waveform)
        }
        let square = 0
        let peak = 0
        let dot = 0
        let leftSquare = 0
        let rightSquare = 0
        let width = 0
        for (let index = 0; index < metrics.waveform.length; index += 1) {
          const value = metrics.waveform[index]
          const l = metrics.leftWaveform[index]
          const r = metrics.rightWaveform[index]
          square += value * value
          peak = Math.max(peak, Math.abs(value))
          dot += l * r
          leftSquare += l * l
          rightSquare += r * r
          width += Math.abs(l - r)
        }
        metrics.rms = Math.sqrt(square / metrics.waveform.length)
        metrics.peak = peak
        metrics.bass = average(metrics.spectrum, 0, 12)
        metrics.mid = average(metrics.spectrum, 12, 52)
        metrics.treble = average(metrics.spectrum, 52, metrics.spectrum.length)
        let weighted = 0
        let sum = 0
        for (let index = 0; index < metrics.spectrum.length; index += 1) {
          weighted += index * metrics.spectrum[index]
          sum += metrics.spectrum[index]
        }
        metrics.centroid = sum ? weighted / sum / metrics.spectrum.length : 0
        metrics.stereoWidth = Math.min(1, width / metrics.waveform.length)
        metrics.correlation = dot / Math.max(0.0001, Math.sqrt(leftSquare * rightSquare))
      }
      metrics.revision += 1
      setRevision(metrics.revision)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      query.removeEventListener('change', updateMotion)
    }
  }, [analyser, preview])

  return metricsRef.current
}
