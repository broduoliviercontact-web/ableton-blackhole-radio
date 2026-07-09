// Self-check web utils (US-4.6) — runnable : npx tsx web/selfcheck.ts
// Pas de framework : assertions minimales. Ne teste PAS WebRTC (besoin d'un vrai navigateur).
import {
  isBlackHole,
  isLoopback,
  pickPreferredAudioInput,
  looksLikeBuiltInMic,
  type AudioInputDevice,
} from './src/audio/mediaDevices'
import { getOrCreateIdentity } from './src/utils/identity'

function assert(cond: boolean, label: string): void {
  if (!cond) {
    console.error('❌', label)
    process.exit(1)
  }
}

function dev(id: string, label: string): AudioInputDevice {
  return { deviceId: id, label }
}

// isBlackHole (détection label, case-insensitive)
assert(isBlackHole('BlackHole 2ch'), 'BlackHole 2ch détecté')
assert(isBlackHole('blackhole 16ch'), 'blackhole minuscule détecté')
assert(!isBlackHole('MacBook Pro Microphone'), 'micro != BlackHole')
assert(!isBlackHole(''), 'chaîne vide != BlackHole')

// isLoopback
assert(isLoopback('Loopback Audio'), 'Loopback détecté')
assert(!isLoopback('BlackHole 2ch'), 'BlackHole != Loopback')

// pickPreferredAudioInput : priorité BlackHole > Loopback > premier
assert(pickPreferredAudioInput([]) === null, 'liste vide → null')
assert(
  pickPreferredAudioInput([dev('a', 'MacBook Pro Microphone')])?.deviceId === 'a',
  'sans BlackHole/Loopback → premier',
)
assert(
  pickPreferredAudioInput([dev('a', 'MacBook Pro Microphone'), dev('b', 'BlackHole 2ch')])?.deviceId === 'b',
  'BlackHole prioritaire sur le premier',
)
assert(
  pickPreferredAudioInput([dev('a', 'MacBook Pro Microphone'), dev('b', 'Loopback Audio')])?.deviceId === 'b',
  'Loopback prioritaire sur le premier',
)
assert(
  pickPreferredAudioInput([dev('a', 'Loopback Audio'), dev('b', 'BlackHole 2ch')])?.deviceId === 'b',
  'BlackHole prioritaire sur Loopback',
)

// looksLikeBuiltInMic : heuristique douce, exclut virtuels
assert(looksLikeBuiltInMic('MacBook Pro Microphone'), 'micro MacBook = built-in')
assert(looksLikeBuiltInMic('Microphone interne'), 'Microphone interne = built-in')
assert(!looksLikeBuiltInMic('BlackHole 2ch'), 'BlackHole != built-in')
assert(!looksLikeBuiltInMic('Loopback Audio'), 'Loopback != built-in')
assert(!looksLikeBuiltInMic('Focusrite Scarlett 2i2'), 'carte son != built-in')

// identity : format + préfixe (la persistance sessionStorage n'est pas testée hors navigateur)
const p = getOrCreateIdentity('performer')
assert(/^performer-[a-z0-9]{6}$/.test(p), `identity performer format: ${p}`)
const l = getOrCreateIdentity('listener')
assert(/^listener-[a-z0-9]{6}$/.test(l), `identity listener format: ${l}`)

// Layout (tailles du panneau) : clamp client + défauts + wrapCentered rows.
const { resolveVisual, DEFAULT_LAYOUT } = await import('./src/components/splitflap/visual')
const { wrapCentered } = await import('./src/components/splitflap/format')
const def = resolveVisual()
assert(def.layout.titleScale === DEFAULT_LAYOUT.titleScale, 'layout défaut sans visual')
const lay = resolveVisual({
  layout: { titleScale: 10, secondaryScale: 999, noteScale: 90, tickerScale: 110, boardScale: 50, titleRows: 9, secondaryRows: -1 },
})
assert(lay.layout.titleScale === 50, 'client titleScale clamp 50')
assert(lay.layout.secondaryScale === 200, 'client secondaryScale clamp 200')
assert(lay.layout.boardScale === 70, 'client boardScale clamp 70')
assert(lay.layout.titleRows === 3, 'client titleRows clamp 3')
assert(lay.layout.secondaryRows === 0, 'client secondaryRows clamp 0')
// wrapCentered : texte court → 1 ligne ; long → borné par maxRows ; lignes ≤ cols.
const one = wrapCentered('RADIO BLACKHOLE', 32, 3)
assert(one.length === 1 && one[0].length === 32, 'wrapCentered court → 1 ligne paddée')
const many = wrapCentered('A'.repeat(200), 32, 2)
assert(many.length === 2 && many.every((ln) => ln.length === 32), 'wrapCentered long → maxRows lignes, chacune ≤ cols')

console.log('✅ web utils self-check OK (isBlackHole, isLoopback, pickPreferredAudioInput, looksLikeBuiltInMic, identity, layout+wrapCentered)')