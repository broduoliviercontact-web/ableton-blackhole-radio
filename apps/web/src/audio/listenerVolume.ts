// Trim PAD -30 dB du listener (uniquement côté listener : n'affecte ni le
// broadcast performer ni LiveKit). Helper pur (testable hors navigateur).
//
// double-clic sur le bouton haut-parleur bascule le trim. Le volume effectif
// appliqué aux <audio> = (volume% / 100) × gain. Mute = volume% à 0 → 0 ici.

export const DB_TRIM_GAIN = Math.pow(10, -30 / 20) // ≈ 0.0316227766

/** Volume effectif (0–1) appliqué à un <audio> : volume% borné 0–100 → 0–1,
 *  multiplié par le gain de trim -30 dB si actif. Mute = volumePercent 0 → 0. */
export function getEffectiveVolume(volumePercent: number, trimMinus30Db: boolean): number {
  const base = Math.max(0, Math.min(100, volumePercent)) / 100
  return trimMinus30Db ? base * DB_TRIM_GAIN : base
}