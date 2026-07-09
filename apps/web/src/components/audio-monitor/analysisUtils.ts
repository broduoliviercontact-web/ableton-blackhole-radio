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

// --- Spectrogram log remapping ---
//
// Échelle verticale logarithmique : chaque ligne visuelle y (0 = haut/fmax,
// h-1 = bas/fmin) couvre une bande géométrique [fLow, fHigh] de fréquences. Les
// bins FFT correspondants (linéaires en fréquence) sont agrégés (max) → les
// basses prennent plus de place visuelle, les aigus sont compressés. Ce n'est
// PAS un simple étirement d'image : on remappe vraiment les bins vers des lignes.

/** Fraction log [0..1] d'une fréquence dans [fmin..fmax] (0 = fmin, 1 = fmax). */
export function logFraction(freq: number, fmin: number, fmax: number): number {
  return Math.log10(freq / fmin) / Math.log10(fmax / fmin)
}

/** Range de bins FFT [lo..hi] pour une ligne visuelle y (échelle log).
 *  y=0 → haut (fmax), y=h-1 → bas (fmin). Inclus aux deux bornes. */
export function logRowBinRange(
  y: number,
  h: number,
  fmin: number,
  fmax: number,
  sampleRate: number,
  fftSize: number,
): { lo: number; hi: number } {
  const ratio = fmax / fmin
  const fHigh = fmin * Math.pow(ratio, (h - y) / h)
  const fLow = fmin * Math.pow(ratio, (h - y - 1) / h)
  const binCount = fftSize / 2
  const lo = Math.max(0, Math.floor((fLow * fftSize) / sampleRate))
  const hi = Math.min(binCount - 1, Math.ceil((fHigh * fftSize) / sampleRate))
  return { lo, hi }
}

/** Valeur agrégée (max) d'une ligne spectrogram log depuis getByteFrequencyData. */
export function spectrogramRowValue(
  freq: Uint8Array,
  y: number,
  h: number,
  fmin: number,
  fmax: number,
  sampleRate: number,
  fftSize: number,
): number {
  const { lo, hi } = logRowBinRange(y, h, fmin, fmax, sampleRate, fftSize)
  let m = 0
  for (let i = lo; i <= hi; i++) if (freq[i] > m) m = freq[i]
  return m
}