// Helpers d'analyse audio purs (ponytail: extract pure helpers, testables hors
// navigateur). Toutes prennent les buffers déjà remplis par AnalyserNode.

/** Niveau temps-domaine : RMS, peak (0..1), dBFS (-Inf..0). */
export function timeLevel(buf: Float32Array): { rms: number; peak: number; db: number } {
  let sum = 0
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i]
    sum += v * v
    const a = v < 0 ? -v : v
    if (a > peak) peak = a
  }
  const rms = Math.sqrt(sum / buf.length)
  return { rms, peak, db: rms > 0 ? 20 * Math.log10(rms) : -Infinity }
}

/** dBFS → texte d'ambiance (monitoring navigateur, pas LUFS broadcast). */
export function dbLabel(db: number): string {
  if (!Number.isFinite(db) || db <= -60) return 'SILENCE'
  if (db <= -24) return 'NORMAL'
  if (db <= -6) return 'FORT'
  return db <= -1 ? 'PROCHE CLIP' : 'CLIP'
}

/** Conversion index de bin → Hz (AnalyserNode.getByteFrequencyData). */
function binHz(index: number, sampleRate: number, fftSize: number): number {
  return (index * sampleRate) / fftSize
}

/** Énergie moyenne (0..1) d'une bande de fréquences, depuis getByteFrequencyData. */
function bandAvg(freq: Uint8Array, sampleRate: number, fftSize: number, loHz: number, hiHz: number): number {
  const lo = Math.max(1, Math.floor((loHz * fftSize) / sampleRate))
  const hi = Math.min(freq.length - 1, Math.ceil((hiHz * fftSize) / sampleRate))
  if (hi <= lo) return 0
  let s = 0
  for (let i = lo; i <= hi; i++) s += freq[i]
  return s / (hi - lo + 1) / 255
}

export interface FreqBands {
  bass: number
  lowMid: number
  midHigh: number
  air: number
}

export function freqBands(freq: Uint8Array, sampleRate: number, fftSize: number): FreqBands {
  return {
    bass: bandAvg(freq, sampleRate, fftSize, 20, 250),
    lowMid: bandAvg(freq, sampleRate, fftSize, 250, 1000),
    midHigh: bandAvg(freq, sampleRate, fftSize, 1000, 5000),
    air: bandAvg(freq, sampleRate, fftSize, 5000, 16000),
  }
}

/** Centroid spectral = sum(freq*amp) / sum(amp). 0 si silence. */
export function spectralCentroid(freq: Uint8Array, sampleRate: number, fftSize: number): number {
  let num = 0
  let den = 0
  for (let i = 1; i < freq.length; i++) {
    const amp = freq[i] / 255
    if (amp <= 0) continue
    num += binHz(i, sampleRate, fftSize) * amp
    den += amp
  }
  return den > 0 ? num / den : 0
}

/** Corrélation L/R (−1..1) depuis deux buffers temps-domaine alignés. */
export function correlation(left: Float32Array, right: Float32Array): number {
  const n = Math.min(left.length, right.length)
  if (n === 0) return 0
  let sl = 0
  let sr = 0
  let sp = 0
  for (let i = 0; i < n; i++) {
    sl += left[i] * left[i]
    sr += right[i] * right[i]
    sp += left[i] * right[i]
  }
  const d = Math.sqrt(sl * sr)
  return d > 0 ? sp / d : 0
}