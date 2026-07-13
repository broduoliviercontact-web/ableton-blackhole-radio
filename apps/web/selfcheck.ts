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
const { wrapCentered, wrapAligned, alignLine, trimEmptyDisplayLines } = await import('./src/components/splitflap/format')
const def = resolveVisual()
assert(def.visualization === 'split-flap', 'visualization défaut = split-flap')
assert(def.layout.titleScale === DEFAULT_LAYOUT.titleScale, 'layout défaut sans visual')
assert(def.layout.boardColumns === 32, 'boardColumns défaut 32')
const lay = resolveVisual({
  layout: { titleScale: 10, secondaryScale: 999, noteScale: 90, tickerScale: 110, boardScale: 50, titleRows: 9, secondaryRows: -1, boardColumns: 5 },
})
assert(lay.layout.titleScale === 50, 'client titleScale clamp 50')
assert(lay.layout.secondaryScale === 200, 'client secondaryScale clamp 200')
assert(lay.layout.boardScale === 70, 'client boardScale clamp 70')
assert(lay.layout.titleRows === 3, 'client titleRows clamp 3')
assert(lay.layout.secondaryRows === 0, 'client secondaryRows clamp 0')
assert(lay.layout.boardColumns === 12, 'client boardColumns clamp 12')
assert(resolveVisual({ layout: { boardColumns: 999 } }).layout.boardColumns === 64, 'boardColumns clamp 64')
assert(resolveVisual({ visualization: 'crt-terminal' }).visualization === 'crt-terminal', 'visualization crt-terminal')
assert(resolveVisual({ visualization: 'event-horizon' }).visualization === 'event-horizon', 'visualization event-horizon')
const visualControls = resolveVisual({ visualDensity: 0, visualSpeed: 999, visualIntensity: -4, visualGlow: 999, visualPalette: 'ice' })
assert(visualControls.visualDensity === 1 && visualControls.visualSpeed === 100, 'visual controls density/speed clamps')
assert(visualControls.visualIntensity === 1 && visualControls.visualGlow === 100 && visualControls.visualPalette === 'ice', 'visual controls intensity/glow/palette')
const { toRadioVisualData } = await import('./src/components/radio-visuals/visualData')
const normalizedVisualData = toRadioVisualData({ type: 'track', mainTitle: '  TEST SIGNAL ', artist: 'Artist', note: ' Note ', ticker: 'Ticker' })
assert(normalizedVisualData.title === 'TEST SIGNAL' && normalizedVisualData.secondary === 'Artist', 'radio visual data normalizes message fields')
assert(normalizedVisualData.updatedAt === null, 'radio visual data accepts performer preview without updatedAt')

// trimEmptyDisplayLines : retire les lignes vides en fin de bloc, garde ≥1,
// conserve les lignes à contenu (espaces internes intacts).
assert(trimEmptyDisplayLines(['ABC', '          ']).length === 1, 'trim ligne vide en fin de bloc')
assert(trimEmptyDisplayLines(['   ABC    '])[0] === '   ABC    ', 'trim conserve ligne avec contenu (padding intact)')
assert(trimEmptyDisplayLines(['          ', '          ']).length === 1, 'trim garde ≥1 ligne si tout vide')
assert(trimEmptyDisplayLines([]).length === 0, 'trim tableau vide → vide')
// wrapCentered : texte court → 1 ligne ; long → borné par maxRows ; lignes ≤ cols.
const one = wrapCentered('RADIO BLACKHOLE', 32, 3)
assert(one.length === 1 && one[0].length === 32, 'wrapCentered court → 1 ligne paddée')
const many = wrapCentered('A'.repeat(200), 32, 2)
assert(many.length === 2 && many.every((ln) => ln.length === 32), 'wrapCentered long → maxRows lignes, chacune ≤ cols')
// alignLine : left=padEnd, right=padStart, center=équilibré ; wrapAligned borne par rows.
assert(alignLine('AB', 5, 'left') === 'AB   ', 'alignLine left → padEnd')
assert(alignLine('AB', 5, 'right') === '   AB', 'alignLine right → padStart')
assert(alignLine('AB', 5, 'center') === ' AB  ', 'alignLine center → équilibré (pad gauche floor)')
const wa = wrapAligned('A'.repeat(200), 32, 2, 'right')
assert(wa.length === 2 && wa.every((ln) => ln.startsWith(' ') || ln.length === 32), 'wrapAligned right → 2 lignes paddées')
const waL = wrapAligned('AB', 32, 1, 'left')
assert(waL.length === 1 && waL[0] === 'AB' + ' '.repeat(30), 'wrapAligned left court → padEnd 32')

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

// Mode note paged (longues notes lisibles) : resolveVisual conserve noteMode,
// pageDurationMs, hotfxDurationMs ; défaut = paged. Le mode paged est orthogonal
// à noteScrollSpeedMs (résolu indépendamment, ignoré au rendu paged — la page
// publique et l'aperçu partagent resolveVisual, donc mêmes données publiées).
assert(def.noteMode === 'paged', 'noteMode défaut = paged (lisible pour notes longues)')
assert(def.pageDurationMs === 6000 && def.hotfxDurationMs === 100, 'paged défauts pageDuration 6000 / hotfxDuration 100 (flip rapide)')
const paged = resolveVisual({ noteMode: 'paged', pageDurationMs: 9000, hotfxDurationMs: 100, noteScrollSpeedMs: 180 })
assert(paged.noteMode === 'paged', 'resolveVisual conserve noteMode=paged')
assert(paged.pageDurationMs === 9000, 'resolveVisual conserve pageDurationMs (9000 = temps par page)')
assert(paged.hotfxDurationMs === 100, 'resolveVisual conserve hotfxDurationMs (vitesse clapet)')
assert(paged.noteScrollSpeedMs === 180, 'resolveVisual conserve noteScrollSpeedMs (orthogonal : paged l\'ignore au rendu)')
const pagedClamped = resolveVisual({ noteMode: 'paged', pageDurationMs: 600, hotfxDurationMs: 5 })
assert(pagedClamped.pageDurationMs === 2000, 'pageDurationMs clamp min 2000 (paged)')
assert(pagedClamped.hotfxDurationMs === 30, 'hotfxDurationMs clamp min 30 (flip rapide paged)')
// scroll reste un mode explicite (effet bandeau), non forcé en paged par resolveVisual.
assert(resolveVisual({ noteMode: 'scroll' }).noteMode === 'scroll', 'resolveVisual conserve noteMode=scroll')
assert(resolveVisual({ noteMode: 'static' }).noteMode === 'static', 'resolveVisual conserve noteMode=static')

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

// Audio monitor helpers (analysisUtils purs) : RMS/dBFS, bandes, centroid, corrélation.
const { timeLevel, dbLabel, freqBands, spectralCentroid, correlation, logFraction, logRowBinRange, spectrogramRowValue } = await import(
  './src/components/audio-monitor/analysisUtils'
)
const silence = timeLevel(new Float32Array(1024))
assert(silence.rms === 0 && silence.peak === 0 && !Number.isFinite(silence.db), 'timeLevel silence → -Inf dB')
const loud = timeLevel(new Float32Array(1024).fill(0.5))
assert(Math.abs(loud.rms - 0.5) < 1e-9 && Math.abs(loud.db - 20 * Math.log10(0.5)) < 1e-6, 'timeLevel 0.5 → -6.0 dB')
assert(dbLabel(-Infinity) === 'SILENCE' && dbLabel(-30) === 'NORMAL' && dbLabel(-10) === 'FORT' && dbLabel(0) === 'CLIP', 'dbLabel seuils')
// frequencyData synthétique : tout à 0 sauf un pic au bin 4 → centroid ~ freq du bin 4.
const sr = 48000
const fft = 2048
const freq = new Uint8Array(fft / 2)
freq[4] = 200
const fb = freqBands(freq, sr, fft)
assert(fb.bass > 0 && fb.lowMid === 0 && fb.midHigh === 0 && fb.air === 0, 'freqBands : bin 4 (~94 Hz) → bass seul')
const sc = spectralCentroid(freq, sr, fft)
assert(Math.abs(sc - ((4 * sr) / fft)) < 1, `spectralCentroid ≈ freq(bin4) = ${sc}`)
// corrélation : deux signaux identiques → 1 ; opposés → -1.
const sigL = new Float32Array([0.1, 0.2, 0.3, 0.4])
assert(Math.abs(correlation(sigL, sigL) - 1) < 1e-6, 'correlation identique → 1')
assert(Math.abs(correlation(sigL, new Float32Array([-0.1, -0.2, -0.3, -0.4])) + 1) < 1e-6, 'correlation opposé → -1')

// Spectrogram log remapping : logFraction + logRowBinRange + spectrogramRowValue.
assert(Math.abs(logFraction(20, 20, 20000)) < 1e-9, 'logFraction fmin → 0')
assert(Math.abs(logFraction(20000, 20, 20000) - 1) < 1e-9, 'logFraction fmax → 1')
assert(Math.abs(logFraction(200, 20, 20000) - 1 / 3) < 1e-6, 'logFraction 200 Hz → 1/3 (décade du milieu)')
// 48 kHz / fftSize 2048 → binWidth 23.4 Hz, binCount 1024. fmin 20, fmax 20000.
const srMon = 48000
const fftMon = 2048
// Ligne du bas (y=h-1) → bande ~[20 Hz, ~20.9 Hz] → bin 0..1 (1-2 bins).
const bot = logRowBinRange(199, 200, 20, 20000, srMon, fftMon)
assert(bot.lo === 0 && bot.hi <= 1, `ligne basse → bins 0..${bot.hi} (basses = peu de bins)`)
// Ligne du haut (y=0) → bande ~[18974 Hz, 20000 Hz] → plusieurs bins.
const topRow = logRowBinRange(0, 200, 20, 20000, srMon, fftMon)
assert(topRow.hi - topRow.lo >= 2, `ligne haute → >=3 bins (aigus agrégés), got ${topRow.lo}..${topRow.hi}`)
// spectrogramRowValue agrège (max) : un pic isolé dans la bande ressort.
const freqMon = new Uint8Array(fftMon / 2)
freqMon[topRow.lo + 1] = 250
assert(spectrogramRowValue(freqMon, 0, 200, 20, 20000, srMon, fftMon) === 250, 'spectrogramRowValue agrège le max de la bande')
assert(spectrogramRowValue(freqMon, 199, 200, 20, 20000, srMon, fftMon) === 0, 'spectrogramRowValue bande vide → 0')

// Audio RX stats (débit WebRTC entrant) : computeAudioRx pur depuis un
// RTCStatsReport fake + l'instantané précédent (delta bitrate / jitter / loss).
const { computeAudioRx } = await import('./src/audio/audioReceiverStats')
const fakeReport = (stats: object[]): RTCStatsReport =>
  ({ forEach: (cb: (v: unknown) => void) => stats.forEach(cb) } as unknown as RTCStatsReport)
assert(computeAudioRx(fakeReport([]), null).display.available === false, 'computeAudioRx rapport vide → indisponible')
assert(
  computeAudioRx(fakeReport([{ type: 'inbound-rtp', kind: 'video', bytesReceived: 10 }]), null).display.available === false,
  'computeAudioRx inbound video ignoré (audio seul)',
)
const audioFirst = computeAudioRx(
  fakeReport([{ type: 'inbound-rtp', kind: 'audio', bytesReceived: 1000, packetsReceived: 50, packetsLost: 0, jitter: 0.012, timestamp: 1000 }]),
  null,
)
assert(
  audioFirst.display.available === true && audioFirst.display.kbps === null && audioFirst.display.jitterMs === 12 && audioFirst.display.lossPct === 0,
  'computeAudioRx premier poll → dispo, kbps null (pas de delta), jitter 12 ms, loss 0',
)
assert(audioFirst.snapshot?.bytesReceived === 1000, 'computeAudioRx snapshot mémorisé pour le prochain delta')
const audioDelta = computeAudioRx(
  fakeReport([{ type: 'inbound-rtp', kind: 'audio', bytesReceived: 6000, packetsReceived: 100, packetsLost: 1, jitter: 0.012, timestamp: 2000 }]),
  audioFirst.snapshot,
)
assert(audioDelta.display.kbps === 40, 'computeAudioRx delta 5000 B / 1 s → 40 kbps')
assert(audioDelta.display.lossPct === 1, 'computeAudioRx loss 1/101 → 1.0 %')
assert(audioDelta.display.packetsReceived === 100 && audioDelta.display.packetsLost === 1, 'computeAudioRx compteurs cumulés')

// useResizablePanel clampHeight : borne 220–760, arrondi, défaut sûr si NaN/Infinity.
const { clampHeight, PANEL_MIN_HEIGHT, PANEL_MAX_HEIGHT, PANEL_DEFAULT_HEIGHT } = await import('./src/hooks/useResizablePanel')
assert(PANEL_MIN_HEIGHT === 220 && PANEL_MAX_HEIGHT === 760 && PANEL_DEFAULT_HEIGHT === 360, 'panneau bornes 220/760 défaut 360')
assert(clampHeight(360) === 360, 'clampHeight dans la borne → inchangé')
assert(clampHeight(100) === 220, 'clampHeight sous le min → 220')
assert(clampHeight(9999) === 760, 'clampHeight au-dessus du max → 760')
assert(clampHeight(450.7) === 451, 'clampHeight arrondit')
assert(clampHeight(NaN) === 360 && clampHeight(Infinity) === 760, 'clampHeight NaN → défaut, Infinity → max')

// Radio MIDI Message Bridge — protocole v1 (encode/decode roundtrip + rejets).
const {
  createRadioMidiPacket,
  encodePacketToMidiNotes,
  decodePacketFromMidiNotes,
  encodePacketToBase64,
  decodePacketFromBase64,
  isValidBase64MidiNote,
  computeRadioMidiChecksum,
  isDuplicateEventId,
  MIDI_START_MESSAGE,
  MIDI_END_MESSAGE,
  MIDI_CLEAR_BUFFER,
  RADIO_MIDI_PROTOCOL,
  RADIO_MIDI_VERSION,
  RADIO_MIDI_CHANNEL,
  RADIO_MIDI_MAX_BASE64_LENGTH,
} = await import('./src/lib/radioMidiMessageProtocol')

// Roundtrip avec accents français (UTF-8 → Base64 → notes → decode).
const accentedNote = "À l'échelle du globe, les pirates créèrent un réseau d'information."
const midiMsg = {
  type: 'track',
  mainTitle: 'FM CLOUDS',
  artist: 'Olivier',
  note: accentedNote,
  ticker: 'Ableton → MIDI → Max → JSON → Radio',
  brandLabel: 'RADIO BLACKHOLE',
  visual: { splitFlapEngine: 'hotfx', noteMode: 'paged', pageDurationMs: 6000, hotfxDurationMs: 100 },
}
const pkt = createRadioMidiPacket('track-001-intro', midiMsg)
assert(pkt.protocol === RADIO_MIDI_PROTOCOL, 'radio-midi: protocol = radio-midi-message')
assert(pkt.version === RADIO_MIDI_VERSION, 'radio-midi: version = 1')
assert(pkt.eventId === 'track-001-intro', 'radio-midi: eventId conservé')
assert(RADIO_MIDI_CHANNEL === 16, 'radio-midi: canal utilisateur = 16')
const notes = encodePacketToMidiNotes(pkt)
assert(notes[0] === MIDI_START_MESSAGE, 'radio-midi: START_MESSAGE en tête')
assert(notes[notes.length - 1] === MIDI_END_MESSAGE, 'radio-midi: END_MESSAGE en fin')
const decoded = decodePacketFromMidiNotes(notes)
assert(decoded.protocol === RADIO_MIDI_PROTOCOL, 'radio-midi: decode protocol')
assert(decoded.version === RADIO_MIDI_VERSION, 'radio-midi: decode version')
assert(decoded.eventId === 'track-001-intro', 'radio-midi: decode eventId')
assert((decoded.message as { note: string }).note === accentedNote, 'radio-midi: roundtrip accents UTF-8 intacts')
assert((decoded.message as { visual: { noteMode: string } }).visual.noteMode === 'paged', 'radio-midi: decode visual.noteMode')
assert(typeof decoded.checksum === 'string' && decoded.checksum.length > 0, 'radio-midi: checksum présent après decode')

// Notes de contrôle absentes du payload ; START/END encadrent le Base64.
const inner = notes.slice(1, -1)
assert(inner.every((n) => n !== MIDI_START_MESSAGE && n !== MIDI_END_MESSAGE && n !== MIDI_CLEAR_BUFFER), 'radio-midi: notes contrôle absentes du payload')
assert(inner.every(isValidBase64MidiNote), 'radio-midi: payload = notes Base64 valides (43–122)')

// CLEAR (3) dans le payload → rejeté.
try {
  decodePacketFromMidiNotes([MIDI_START_MESSAGE, 65, MIDI_CLEAR_BUFFER, 66, MIDI_END_MESSAGE])
  assert(false, 'radio-midi: CLEAR dans payload doit être rejeté')
} catch (e) {
  assert(/non-Base64|hors plage/i.test((e as Error).message), 'radio-midi: CLEAR rejeté avec message clair')
}

// Version incorrecte → rejetée.
try {
  decodePacketFromBase64(
    encodePacketToBase64({ ...pkt, version: 2 as unknown as 1 }),
  )
  assert(false, 'radio-midi: version 2 doit être rejetée')
} catch (e) {
  assert(/version/i.test((e as Error).message), 'radio-midi: version incorrecte rejetée')
}

// Protocol incorrect → rejeté.
try {
  decodePacketFromBase64(encodePacketToBase64({ ...pkt, protocol: 'autre' as 'radio-midi-message' }))
  assert(false, 'radio-midi: protocol étranger doit être rejeté')
} catch (e) {
  assert(/protocol/i.test((e as Error).message), 'radio-midi: protocol invalide rejeté')
}

// Notes hors 0–127 → rejetées.
try {
  decodePacketFromMidiNotes([MIDI_START_MESSAGE, 200, MIDI_END_MESSAGE])
  assert(false, 'radio-midi: note 200 doit être rejetée')
} catch (e) {
  assert(/hors plage/i.test((e as Error).message), 'radio-midi: note >127 rejetée')
}
try {
  decodePacketFromMidiNotes([MIDI_START_MESSAGE, -5, MIDI_END_MESSAGE])
  assert(false, 'radio-midi: note -5 doit être rejetée')
} catch (e) {
  assert(/hors plage/i.test((e as Error).message), 'radio-midi: note <0 rejetée')
}

// Payload sans START/END → rejeté.
try {
  decodePacketFromMidiNotes([65, 66, 67])
  assert(false, 'radio-midi: payload sans START doit être rejeté')
} catch (e) {
  assert(/START_MESSAGE/i.test((e as Error).message), 'radio-midi: START manquant rejeté')
}
try {
  decodePacketFromMidiNotes([MIDI_START_MESSAGE, 65, 66])
  assert(false, 'radio-midi: payload sans END doit être rejeté')
} catch (e) {
  assert(/END_MESSAGE/i.test((e as Error).message), 'radio-midi: END manquant rejeté')
}

// Checksum : corruption d'un caractère Base64 → mismatch détecté.
const goodB64 = encodePacketToBase64(pkt)
const corrupted = goodB64.slice(0, 4) + (goodB64[4] === 'A' ? 'B' : 'A') + goodB64.slice(5)
try {
  decodePacketFromBase64(corrupted)
  assert(false, 'radio-midi: checksum doit détecter la corruption')
} catch (e) {
  assert(/checksum|décode JSON/i.test((e as Error).message), 'radio-midi: corruption détectée (checksum/JSON)')
}

// eventId vide → rejeté à la création.
try {
  createRadioMidiPacket('', midiMsg)
  assert(false, 'radio-midi: eventId vide doit être rejeté')
} catch (e) {
  assert(/eventId/i.test((e as Error).message), 'radio-midi: eventId vide rejeté')
}

// Anti-duplication eventId : même eventId < 2 s = duplicate, > 2 s = ok.
assert(isDuplicateEventId('a', 'a', 1000, 1500) === true, 'radio-midi: même eventId < 2s = duplicate')
assert(isDuplicateEventId('a', 'a', 1000, 3500) === false, 'radio-midi: même eventId > 2s = non duplicate')
assert(isDuplicateEventId('a', 'b', 1000, 1500) === false, 'radio-midi: eventId différent = non duplicate')
assert(isDuplicateEventId('a', null, null, 1500) === false, "radio-midi: pas d'historique = non duplicate")

// Limite taille : base64 trop long → refusé. On force un message énorme.
const huge = createRadioMidiPacket('big', { note: 'X'.repeat(RADIO_MIDI_MAX_BASE64_LENGTH * 2) })
try {
  encodePacketToMidiNotes(huge)
  assert(false, 'radio-midi: payload > limite doit être refusé')
} catch (e) {
  assert(/trop long/i.test((e as Error).message), 'radio-midi: payload trop long refusé avec message clair')
}

// Checksum déterministe et borné (hex, ≤ 4 chars car mod 65535 < 0x10000).
const cs = computeRadioMidiChecksum(goodB64)
assert(/^[0-9a-f]{1,4}$/.test(cs), `radio-midi: checksum hex borné (got ${cs})`)

// Writer .mid (SMF type 0, canal 16) : START + payload + END présents sur le canal 16.
const { buildRadioMidiFile, radioMidiClipDurationMs } = await import('./src/lib/midiFileWriter')
const mid = buildRadioMidiFile(notes)
// En-tête SMF : "MThd", longueur 6, format 0, 1 piste, division 480 (TPQN).
assert(mid[0] === 0x4d && mid[1] === 0x54 && mid[2] === 0x68 && mid[3] === 0x64, 'midi: header MThd')
// format = bytes[8..9], ntracks = [10..11], division = [12..13]
assert(mid[8] === 0 && mid[9] === 0, 'midi: format 0')
assert(mid[10] === 0 && mid[11] === 1, 'midi: 1 piste (type 0)')
assert(mid[12] === 0x01 && mid[13] === 0xe0, 'midi: division 480 TPQN')
// Scanne les note-on status 0x9F (canal 16 raw) → pitches dans l'ordre.
// Les data bytes sont < 0x80, donc 0x9F n'apparaît qu'en tant que status.
const onPitches: number[] = []
for (let i = 0; i < mid.length - 2; i++) {
  if (mid[i] === 0x9f) onPitches.push(mid[i + 1])
}
assert(onPitches[0] === MIDI_START_MESSAGE, 'midi: première note-on = START (pitch 1)')
assert(onPitches[onPitches.length - 1] === MIDI_END_MESSAGE, 'midi: dernière note-on = END (pitch 2)')
assert(onPitches.length === notes.length, 'midi: nombre de note-on = notes (START+payload+END)')
assert(onPitches[1] === notes[1] && onPitches[2] === notes[2], 'midi: payload Base64 préservé (pitches)')
// End-of-track meta 0xFF 0x2F 0x00 présent en fin de piste.
assert(mid[mid.length - 3] === 0xff && mid[mid.length - 2] === 0x2f && mid[mid.length - 1] === 0x00, 'midi: End-of-Track meta')
// Durée approx positive et cohérente (slot 1/32 ≈ 62.5 ms/note @120 BPM).
const dur = radioMidiClipDurationMs(notes.length)
assert(dur === notes.length * 62.5, 'midi: durée approx = notes × 62.5 ms (grille 1/32, 120 BPM)')

// Scenes radio : presets systeme et capture d'une configuration complete.
const { BUILT_IN_SCENES, createCustomScene, sceneVisualization } = await import('./src/components/radio-scenes/radioScenes')
assert(BUILT_IN_SCENES.length === 16, 'scenes: 16 scenes systeme')
assert(BUILT_IN_SCENES.every((scene) => scene.builtIn), 'scenes: presets marques systeme')
assert(sceneVisualization(BUILT_IN_SCENES[0]) === 'crt-terminal', 'scenes: accueil = CRT')
assert(new Set(BUILT_IN_SCENES.map((scene) => scene.visual.visualization)).size === 16, 'scenes: une scene par visualisation')
const customScene = createCustomScene('  Ma scene  ', { type: 'note', mainTitle: 'TEST' }, { visualization: 'ascii-wave', layout: { boardColumns: 28 } })
assert(customScene.name === 'Ma scene', 'scenes: nom nettoye')
assert(customScene.visual.layout?.boardColumns === 28 && sceneVisualization(customScene) === 'ascii-wave', 'scenes: visual capture')

console.log('✅ web utils self-check OK (devices, identity, layout+wrapCentered+boardColumns+trim, ticker+scroll, paged note+resolveVisual, trim -30 dB, accents HotFX, audio monitor, audio rx stats, resizable panel clamp, radio-midi protocol roundtrip+rejets, midi file writer, scenes)')
