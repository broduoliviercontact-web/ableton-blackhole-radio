import type { BroadcastInput, BroadcastVisual, Visualization } from '../../api/broadcastMessage'

export interface RadioScene {
  id: string
  name: string
  description: string
  builtIn: boolean
  form: BroadcastInput
  visual: BroadcastVisual
}

const STORAGE_KEY = 'radio-blackhole.custom-scenes.v1'
const MAX_CUSTOM_SCENES = 24

export const BUILT_IN_SCENES: RadioScene[] = [
  {
    id: 'home-crt',
    name: 'Accueil / CRT',
    description: 'Identite radio en veille, ecran phosphore et message editorial.',
    builtIn: true,
    form: {
      type: 'announcement',
      brandLabel: 'RADIO BLACKHOLE',
      mainTitle: 'RADIO BLACKHOLE',
      subtitle: 'LIVE WEB AUDIO STREAM',
      note: 'Une radio pirate pour Ableton, textures brutes, fragments de studio et signaux venus du bord.',
      ticker: 'RADIO BLACKHOLE · LIVE FROM THE CONTROL ROOM · NEXT TRANSMISSION SOON',
    },
    visual: { visualization: 'crt-terminal', preset: 'terminal-amber', tickerEnabled: true },
  },
  {
    id: 'playing-scope',
    name: 'Now Playing / Scope',
    description: 'Lecture en direct avec oscilloscope audio et metadata de morceau.',
    builtIn: true,
    form: {
      type: 'track',
      brandLabel: 'RADIO BLACKHOLE',
      mainTitle: 'MORCEAU RANDOM',
      subtitle: 'LIVE TRANSMISSION',
      artist: 'Various Artist',
      note: 'Selection en direct depuis la control room.',
      ticker: 'NOW PLAYING · RADIO BLACKHOLE · LISTEN LIVE',
    },
    visual: { visualization: 'signal-scope', preset: 'pirate-industrial', tickerEnabled: true },
  },
  {
    id: 'alert-ascii',
    name: 'Annonce / ASCII',
    description: 'Message special sous forme de signal typographique.',
    builtIn: true,
    form: {
      type: 'announcement',
      brandLabel: 'RADIO BLACKHOLE',
      mainTitle: 'SIGNAL SPECIAL',
      subtitle: 'CONTROL ROOM MESSAGE',
      note: 'Message special a afficher sur le panneau public.',
      ticker: 'SPECIAL ANNOUNCEMENT · RADIO BLACKHOLE',
    },
    visual: { visualization: 'ascii-wave', preset: 'terminal-amber', tickerEnabled: true },
  },
  {
    id: 'departure-flap',
    name: 'Programme / Flap',
    description: 'Le panneau mecanique signature pour une grille ou une emission.',
    builtIn: true,
    form: {
      type: 'show',
      brandLabel: 'RADIO BLACKHOLE',
      mainTitle: 'CONTROL ROOM',
      subtitle: 'PROGRAMME EN DIRECT',
      note: 'Selection, improvisation et transmissions depuis le studio.',
      ticker: 'RADIO BLACKHOLE · ON AIR · LIVE FROM THE CONTROL ROOM',
    },
    visual: {
      visualization: 'split-flap',
      splitFlapEngine: 'hotfx',
      preset: 'airport-classic',
      noteMode: 'paged',
      tickerEnabled: true,
      layout: { boardColumns: 32, titleAlign: 'center', secondaryAlign: 'center', noteAlign: 'center' },
    },
  },
  {
    id: 'teletext-bulletin', name: 'Bulletin / Teletext', description: 'Page de bulletin radio, concise et immédiatement lisible.', builtIn: true,
    form: { type: 'announcement', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'BULLETIN DE NUIT', subtitle: 'STUDIO 04 // SIGNAL OUVERT', note: 'La transmission est active. Fragments de studio, improvisations et nouvelles fréquences.', ticker: 'BHX 101 · BULLETIN RADIO · SIGNAL OUVERT' },
    visual: { visualization: 'teletext', visualDensity: 42, visualSpeed: 34, visualIntensity: 58, visualPalette: 'signal', tickerEnabled: true },
  },
  {
    id: 'led-alert', name: 'Alerte / Dot Matrix', description: 'Affiche LED dense pour une annonce immédiate.', builtIn: true,
    form: { type: 'announcement', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'TRANSMISSION SPECIALE', subtitle: 'LIVE FROM THE CONTROL ROOM', note: 'Une annonce courte pour interrompre le programme sans perdre la présence du son.', ticker: 'SPECIAL TRANSMISSION · RADIO BLACKHOLE' },
    visual: { visualization: 'dot-matrix', visualDensity: 74, visualSpeed: 62, visualIntensity: 82, visualGlow: 72, tickerEnabled: true },
  },
  {
    id: 'packet-uptime', name: 'Uplink / Packets', description: 'Flux de données et metadata de diffusion.', builtIn: true,
    form: { type: 'show', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'UPLINK 04', subtitle: 'WEBRTC DATA BURST', note: 'La control room envoie une suite de paquets, de voix et de fragments de programme.', ticker: 'UPLINK · PACKET STREAM · RADIO BLACKHOLE' },
    visual: { visualization: 'packet-stream', visualDensity: 58, visualSpeed: 66, visualIntensity: 64, visualPalette: 'ice', tickerEnabled: true },
  },
  {
    id: 'waterfall-listening', name: 'Listening / Waterfall', description: 'Lecture live centrée sur le spectre et la durée.', builtIn: true,
    form: { type: 'track', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'DARK FREQUENCIES', subtitle: 'NOW PLAYING // LIVE INPUT', artist: 'Various Artist', note: 'Le spectre suit la matière sonore du flux LiveKit, ou un signal simulé dans l aperçu.', ticker: 'NOW PLAYING · DARK FREQUENCIES · LISTEN LIVE' },
    visual: { visualization: 'spectrum-waterfall', visualDensity: 68, visualSpeed: 45, visualIntensity: 78, visualPalette: 'ice', tickerEnabled: true },
  },
  {
    id: 'orbit-stereo', name: 'Stereo / Orbit', description: 'Image stéréo circulaire pour un morceau en direct.', builtIn: true,
    form: { type: 'track', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'WIDE SIGNAL', subtitle: 'STEREO FIELD', artist: 'BLACKHOLE RESIDENT', note: 'Une scène conçue pour faire sentir l espace entre les canaux gauche et droit.', ticker: 'STEREO ORBIT · RADIO BLACKHOLE · LIVE' },
    visual: { visualization: 'stereo-orbit', visualDensity: 54, visualSpeed: 51, visualIntensity: 70, visualGlow: 64, visualPalette: 'ice', tickerEnabled: true },
  },
  {
    id: 'persistence-archive', name: 'Archive / Persistence', description: 'Trace phosphore lente pour une archive ou un interlude.', builtIn: true,
    form: { type: 'note', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'ARCHIVE EN COURS', subtitle: 'ANALOG MEMORY LOOP', note: 'Des traces restent sur l écran après le passage du signal. La radio garde une mémoire courte.', ticker: 'ANALOG PERSISTENCE · ARCHIVE RADIO' },
    visual: { visualization: 'analog-persistence', visualDensity: 47, visualSpeed: 28, visualIntensity: 56, visualGlow: 72, visualPalette: 'phosphor', tickerEnabled: true },
  },
  {
    id: 'horizon-guest', name: 'Guest / Event Horizon', description: 'Annonce d invité avec une gravité visuelle dense.', builtIn: true,
    form: { type: 'show', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'GUEST TRANSMISSION', subtitle: 'LIVE SET AT 23:00', note: 'Un invité traverse le signal ce soir. Rendez vous au bord de la fréquence.', ticker: 'GUEST TRANSMISSION · 23:00 · RADIO BLACKHOLE' },
    visual: { visualization: 'event-horizon', visualDensity: 63, visualSpeed: 48, visualIntensity: 86, visualGlow: 78, visualPalette: 'signal', tickerEnabled: true },
  },
  {
    id: 'radar-call', name: 'Contact / Radar', description: 'Balayage tactique pour chercher un contact radio.', builtIn: true,
    form: { type: 'announcement', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'CONTACT DETECTE', subtitle: 'SECTOR 07 // INCOMING', note: 'Une transmission entrante a été détectée. Le radar cherche encore son origine.', ticker: 'RADAR TRANSMISSION · CONTACT DETECTE' },
    visual: { visualization: 'radar-transmission', visualDensity: 59, visualSpeed: 55, visualIntensity: 73, visualGlow: 68, visualPalette: 'phosphor', tickerEnabled: true },
  },
  {
    id: 'constellation-night', name: 'Night / Constellation', description: 'Réseau céleste pour un programme nocturne.', builtIn: true,
    form: { type: 'show', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'NIGHT CONSTELLATION', subtitle: 'SLOW SIGNALS // OPEN CHANNEL', note: 'Un programme nocturne fait de liens fragiles, de textures lentes et de voix lointaines.', ticker: 'NIGHT CONSTELLATION · RADIO BLACKHOLE' },
    visual: { visualization: 'constellation-radio', visualDensity: 64, visualSpeed: 33, visualIntensity: 62, visualGlow: 54, visualPalette: 'ice', tickerEnabled: true },
  },
  {
    id: 'mosaic-session', name: 'Session / Pixel Mosaic', description: 'Grille pixel pour une session Ableton énergique.', builtIn: true,
    form: { type: 'track', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'PIXEL SESSION', subtitle: 'ABLETON LIVE ROUTING', artist: 'CONTROL ROOM', note: 'Une session de machines et de clips, découpée en blocs de couleurs qui suivent le signal.', ticker: 'PIXEL SESSION · ABLETON LIVE · ON AIR' },
    visual: { visualization: 'pixel-mosaic', visualDensity: 72, visualSpeed: 58, visualIntensity: 76, visualPalette: 'signal', tickerEnabled: true },
  },
  {
    id: 'kinetic-premiere', name: 'Première / Kinetic', description: 'Titre mobile et typographique pour une première.', builtIn: true,
    form: { type: 'announcement', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'PREMIERE TONIGHT', subtitle: 'NEW MATERIAL // 21:30', note: 'Une première radio pour une nouvelle pièce. Le titre devient la scène.', ticker: 'PREMIERE TONIGHT · 21:30 · RADIO BLACKHOLE' },
    visual: { visualization: 'kinetic-type', visualDensity: 40, visualSpeed: 64, visualIntensity: 83, visualPalette: 'mono', tickerEnabled: true },
  },
  {
    id: 'tape-after-hours', name: 'After Hours / Tape', description: 'Machine à bande lente pour une émission de nuit.', builtIn: true,
    form: { type: 'show', brandLabel: 'RADIO BLACKHOLE', mainTitle: 'AFTER HOURS TAPE', subtitle: 'SIDE A // 00:00-02:00', note: 'Deux heures de sélections, de prises longues et de transmissions sans montage.', ticker: 'AFTER HOURS TAPE · SIDE A · RADIO BLACKHOLE' },
    visual: { visualization: 'tape-machine', visualDensity: 46, visualSpeed: 35, visualIntensity: 57, visualPalette: 'amber', tickerEnabled: true },
  },
]

export function sceneVisualization(scene: RadioScene): Visualization {
  return scene.visual.visualization ?? 'split-flap'
}

export function createCustomScene(name: string, form: BroadcastInput, visual: BroadcastVisual): RadioScene {
  const cleanName = name.trim().slice(0, 48) || 'Nouvelle scene'
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    description: `${visual.visualization ?? 'split-flap'} · ${form.mainTitle.trim() || 'message sans titre'}`,
    builtIn: false,
    form: { ...form },
    visual: { ...visual, layout: visual.layout ? { ...visual.layout } : undefined },
  }
}

function isStoredScene(value: unknown): value is RadioScene {
  if (!value || typeof value !== 'object') return false
  const scene = value as Partial<RadioScene>
  return typeof scene.id === 'string' && typeof scene.name === 'string' && typeof scene.description === 'string' && !!scene.form && !!scene.visual
}

export function loadCustomScenes(): RadioScene[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(isStoredScene).filter((scene) => !scene.builtIn).slice(0, MAX_CUSTOM_SCENES)
      : []
  } catch {
    return []
  }
}

export function persistCustomScenes(scenes: RadioScene[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes.slice(0, MAX_CUSTOM_SCENES)))
}
