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

// Ticker + note scroll (visual résolu) : clamp + défauts + anciens messages valides.
const tickerDef = resolveVisual()
assert(tickerDef.tickerSpeedMs === 22000 && tickerDef.tickerDirection === 'left', 'ticker défauts')
assert(tickerDef.tickerSeparator === ' · ' && tickerDef.tickerEnabled === true, 'ticker défauts sep+enabled')
assert(tickerDef.noteScrollSpeedMs === 180 && tickerDef.noteScrollStep === 1 && tickerDef.noteScrollLoop === true, 'note scroll défauts')
const tickerC = resolveVisual({
  tickerSpeedMs: 1000, tickerDirection: 'right', tickerSeparator: 'X'.repeat(40),
  tickerEnabled: false, noteScrollSpeedMs: 10, noteScrollStep: 99, noteScrollLoop: false,
})
assert(tickerC.tickerSpeedMs === 5000, 'tickerSpeedMs clamp 5000')
assert(tickerC.tickerDirection === 'right', 'tickerDirection right')
assert(tickerC.tickerSeparator?.length === 12, 'tickerSeparator clamp 12')
assert(tickerC.tickerEnabled === false, 'tickerEnabled false')
assert(tickerC.noteScrollSpeedMs === 100, 'noteScrollSpeedMs clamp 100')
assert(tickerC.noteScrollStep === 8, 'noteScrollStep clamp 8')
assert(tickerC.noteScrollLoop === false, 'noteScrollLoop false')

// computeScrollLines : décalage char-par-char, lignes = tranches consécutives, loop reboucle.
const { computeScrollLines } = await import('./src/components/splitflap/useScrollingTextWindow')
const S = 'ABCDEFGH' // L=8
const w0 = computeScrollLines(S, 0, 4, 2, true)
assert(w0.length === 2 && w0[0] === 'ABCD' && w0[1] === 'EFGH', 'scroll offset 0 → ABCD/EFGH')
const w1 = computeScrollLines(S, 1, 4, 2, true)
assert(w1[0] === 'BCDE' && w1[1] === 'FGHA', 'scroll offset 1 → BCDE/FGHA (loop wrap)')
const wStep = computeScrollLines(S, 2, 4, 2, true)
assert(wStep[0] === 'CDEF', 'scroll offset 2 → CDEF')
// non-loop : queue paddée d'espaces, fenêtre fixe largeur.
const noloop = computeScrollLines('ABC', 0, 5, 1, false)
assert(noloop[0] === 'ABC  ' && noloop[0].length === 5, 'scroll non-loop court → paddé à width')

// Trim PAD -30 dB (getEffectiveVolume) : dB → gain, exemples de la spec.
const { getEffectiveVolume, DB_TRIM_GAIN } = await import('./src/audio/listenerVolume')
assert(Math.abs(DB_TRIM_GAIN - 0.0316227766) < 1e-9, 'DB_TRIM_GAIN ≈ 0.0316')
assert(getEffectiveVolume(100, false) === 1, '100% trim off → 1.0')
assert(Math.abs(getEffectiveVolume(100, true) - DB_TRIM_GAIN) < 1e-9, '100% trim on → 0.0316')
assert(Math.abs(getEffectiveVolume(50, true) - DB_TRIM_GAIN / 2) < 1e-9, '50% trim on → 0.0158')
assert(getEffectiveVolume(0, true) === 0 && getEffectiveVolume(0, false) === 0, '0% → 0 dans tous les cas')
assert(getEffectiveVolume(150, false) === 1 && getEffectiveVolume(-20, true) === 0, 'borne 0–100 (pas de boost)')

// Accents français dans l'alphabet HotFX par défaut : l'espace initial reste en
// tête, les accents courants sont présents, la limite serveur (120) est tenue.
// HotFX uppercasse le texte cible puis cherche chaque caractère dans
// l'alphabet ; un caractère absent devient espace (index 0) → accents perdus.
const { DEFAULT_HOTFX_CHARACTERS } = await import('./src/components/splitflap/visual')
assert(DEFAULT_HOTFX_CHARACTERS[0] === ' ', 'alphabet HotFX : espace initial significatif')
assert(DEFAULT_HOTFX_CHARACTERS.length <= 120, 'alphabet HotFX ≤ limite serveur 120')
for (const c of ['À', 'Â', 'Ä', 'Ç', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ö', 'Ù', 'Û', 'Ü', 'Ÿ', 'Œ', 'Æ']) {
  assert(DEFAULT_HOTFX_CHARACTERS.includes(c), `alphabet HotFX contient l'accent « ${c} »`)
}
// Phrase de test spec : les accents (minuscules) uppercassés restent dans l'alphabet.
const testSentence = "À l'échelle du globe, les pirates créèrent un réseau d'information."
const accents = new Set([...testSentence].map((c) => c.toUpperCase()).filter((c) => /[ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/.test(c)))
for (const c of accents) {
  assert(DEFAULT_HOTFX_CHARACTERS.includes(c), `accent de la phrase « ${c} » présent dans l'alphabet`)
}

console.log('✅ web utils self-check OK (devices, identity, layout+wrapCentered, ticker+scroll, trim -30 dB, accents HotFX)')