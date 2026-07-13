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
