// Bus d'analyse audio côté listener (US-audio-monitor). Tappe le flux LiveKit
// SANS toucher à l'écoute : chaque remote track est aussi branchée sur un graphe
// Web Audio dédié à l'analyse (AnalserNode = puits, jamais connecté à
// destination → aucun doublage audible). Le <audio> de useLiveKitListen garde
// son propre pipeline (volume / mute / PAD -30 dB inchangés).
//
// AudioContext créé paresseusement au premier addTrack (donc après le geste
// « Listen live » — respecte l'autoplay policy). Recréé proprement au stop.

export class ListenerAudioAnalyser {
  ctx: AudioContext | null = null
  mainAnalyser: AnalyserNode | null = null // mix stéréo (spectre, centroid…)
  leftAnalyser: AnalyserNode | null = null
  rightAnalyser: AnalyserNode | null = null
  private splitter: ChannelSplitterNode | null = null
  private sources = new Map<MediaStreamTrack, MediaStreamAudioSourceNode>()

  get active(): boolean {
    return this.ctx != null && this.sources.size > 0
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 0
  }

  // ponytail: ctx créé ici (pas au mount) → seulement après geste utilisateur.
  private ensureContext(): void {
    if (this.ctx) return
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.mainAnalyser = this.ctx.createAnalyser()
    this.mainAnalyser.fftSize = 2048
    this.mainAnalyser.smoothingTimeConstant = 0.8
    this.leftAnalyser = this.ctx.createAnalyser()
    this.leftAnalyser.fftSize = 2048
    this.rightAnalyser = this.ctx.createAnalyser()
    this.rightAnalyser.fftSize = 2048
    this.splitter = this.ctx.createChannelSplitter(2)
    this.splitter.connect(this.leftAnalyser, 0)
    this.splitter.connect(this.rightAnalyser, 1)
  }

  addTrack(track: MediaStreamTrack): void {
    this.ensureContext()
    if (!this.ctx || !this.mainAnalyser || !this.splitter || this.sources.has(track)) return
    void this.ctx.resume()
    const src = this.ctx.createMediaStreamSource(new MediaStream([track]))
    src.connect(this.mainAnalyser)
    src.connect(this.splitter)
    this.sources.set(track, src)
  }

  removeTrack(track: MediaStreamTrack): void {
    const src = this.sources.get(track)
    if (!src) return
    try {
      src.disconnect()
    } catch {
      // déjà déconnecté
    }
    this.sources.delete(track)
  }

  /** Ferme le graphe (stop listener / unmount). Idempotent. */
  stop(): void {
    for (const src of this.sources.values()) {
      try {
        src.disconnect()
      } catch {
        // ignore
      }
    }
    this.sources.clear()
    if (this.ctx) {
      try {
        void this.ctx.close()
      } catch {
        // déjà fermé
      }
    }
    this.ctx = null
    this.mainAnalyser = null
    this.leftAnalyser = null
    this.rightAnalyser = null
    this.splitter = null
  }
}