// VU-mètre Web Audio pur : AudioContext → MediaStreamSource → Analyser → RMS/peak.

export interface MeterLevel {
  /** 0..1 — niveau RMS du signal. */
  rms: number
  /** 0..1 — valeur crête (peak). */
  peak: number
  /** dBFS, -Infinity (silence) à 0 (pleine échelle). */
  db: number
}

export class AudioMeter {
  private readonly ctx: AudioContext
  private readonly source: MediaStreamAudioSourceNode
  private readonly analyser: AnalyserNode
  private readonly buf: Uint8Array<ArrayBuffer>
  private raf = 0

  constructor(stream: MediaStream) {
    this.ctx = new AudioContext()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 1024
    this.buf = new Uint8Array(this.analyser.fftSize)
    this.source = this.ctx.createMediaStreamSource(stream)
    this.source.connect(this.analyser)
  }

  /** Lance la boucle d'animation ; onLevel est appelée à chaque frame. */
  start(onLevel: (level: MeterLevel) => void): void {
    // L'AudioContext peut démarrer en 'suspended' hors geste utilisateur direct.
    void this.ctx.resume()
    const tick = (): void => {
      this.analyser.getByteTimeDomainData(this.buf)
      let sum = 0
      let peak = 0
      for (let i = 0; i < this.buf.length; i++) {
        const v = (this.buf[i] - 128) / 128
        sum += v * v
        const abs = Math.abs(v)
        if (abs > peak) peak = abs
      }
      const rms = Math.sqrt(sum / this.buf.length)
      onLevel({ rms, peak, db: rms > 0 ? 20 * Math.log10(rms) : -Infinity })
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  /** Libère tout : rAF, nodes, AudioContext. */
  async stop(): Promise<void> {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    try {
      this.source.disconnect()
    } catch {
      // déjà déconnecté
    }
    try {
      await this.ctx.close()
    } catch {
      // déjà fermé
    }
  }
}