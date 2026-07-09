// Accès aux devices audio d'entrée du Mac — aucune dépendance externe.
// BlackHole n'est qu'un cas d'usage recommandé (envoi d'Ableton), pas une contrainte.

export interface AudioInputDevice {
  deviceId: string
  label: string
}

export function isMediaDevicesSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

/**
 * Débloque la permission micro + les labels devices.
 * On capture un stream jetable puis on stoppe immédiatement ses tracks :
 * on ne veut garder aucun flux ici.
 */
export async function requestAudioPermission(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  for (const track of stream.getTracks()) track.stop()
}

export async function getAudioInputDevices(): Promise<AudioInputDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'audioinput')
    .map((d) => ({ deviceId: d.deviceId, label: d.label || '(sans nom)' }))
}

/** Helper optionnel : le label évoque-t-il BlackHole ? */
export function isBlackHole(label: string): boolean {
  return label.toLowerCase().includes('blackhole')
}

/** Helper optionnel : le label évoque-t-il Loopback (Rogue Amoeba) ? */
export function isLoopback(label: string): boolean {
  return label.toLowerCase().includes('loopback')
}

/**
 * Présélection d'entrée par priorité :
 * 1. BlackHole, 2. Loopback, 3. premier audioinput disponible.
 * Pure commodité — l'utilisateur reste libre de choisir n'importe quelle entrée.
 */
export function pickPreferredAudioInput(devices: AudioInputDevice[]): AudioInputDevice | null {
  return devices.find((d) => isBlackHole(d.label)) ?? devices.find((d) => isLoopback(d.label)) ?? devices[0] ?? null
}

/** Heuristique douce : le device ressemble-t-il à un micro intégré (non virtuel) ? */
export function looksLikeBuiltInMic(label: string): boolean {
  const l = label.toLowerCase()
  if (isBlackHole(l) || isLoopback(l)) return false
  return /micro|built-?in|macbook/.test(l)
}