// Self-check US-1.3 : signe un token performer + listener, vérifie les grants.
// Lance : npm run selfcheck (depuis server/) ou `tsx server/src/selfcheck.ts` (racine).

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function ensureSelfcheckEnv(): { storeDir: string; storePath: string; usedFallback: boolean } {
  const storeDir = mkdtempSync(join(tmpdir(), 'radio-broadcast-store-'))
  const storePath = join(storeDir, 'broadcast-message.json')
  const defaults: Record<string, string> = {
    LIVEKIT_URL: 'wss://selfcheck.example.com',
    LIVEKIT_API_KEY: 'selfcheck-api-key',
    LIVEKIT_API_SECRET: 'selfcheck-api-secret',
    PERFORMER_PASSWORD: 'selfcheck-main',
  }
  let usedFallback = false
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value
      usedFallback = true
    }
  }
  process.env.BROADCAST_MESSAGE_STORE_PATH = storePath
  return { storeDir, storePath, usedFallback }
}

function assert(cond: boolean, label: string): void {
  if (!cond) {
    console.error('❌ échec :', label)
    process.exit(1)
  }
}

async function main(): Promise<void> {
  const selfcheckEnv = ensureSelfcheckEnv()
  const [
    { TokenVerifier },
    { createToken },
    { config },
    { checkPerformerAccess, parseAllowedPasswords },
    { getBroadcastMessage, parseBroadcastMessage, setBroadcastMessage },
  ] = await Promise.all([
    import('livekit-server-sdk'),
    import('./livekit.js'),
    import('./config.js'),
    import('./performerAuth.js'),
    import('./broadcastMessage.js'),
  ])

  const verifier = new TokenVerifier(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET)

  const { token: pToken } = await createToken({ roomName: 'main', identity: 'performer-test', role: 'performer' })
  const p = await verifier.verify(pToken)
  assert(p.video?.roomJoin === true, 'performer roomJoin')
  assert(p.video?.room === 'main', 'performer room')
  assert(p.video?.canPublish === true, 'performer canPublish')
  assert(p.video?.canSubscribe === true, 'performer canSubscribe')

  const { token: lToken } = await createToken({ roomName: 'main', identity: 'listener-test', role: 'listener' })
  const l = await verifier.verify(lToken)
  assert(l.video?.roomJoin === true, 'listener roomJoin')
  assert(l.video?.canPublish === false, 'listener canPublish false')
  assert(l.video?.canSubscribe === true, 'listener canSubscribe')

  console.log(`✅ token grants OK (performer publish+subscribe, listener subscribe-only${selfcheckEnv.usedFallback ? ' ; env selfcheck factice' : ''})`)

  // Mot de passe performer : accepté si présent dans la liste autorisée, refusé sinon,
  // 503 si aucun configuré. Liste = PERFORMER_PASSWORD + PERFORMER_PASSWORDS (split/trim/filtre-vides).
  const allowed = parseAllowedPasswords(config.PERFORMER_PASSWORD, config.PERFORMER_PASSWORDS)

  // Accepté via PERFORMER_PASSWORD (unique).
  assert(checkPerformerAccess('main', parseAllowedPasswords('main', undefined)).ok === true, 'unique password accepté')
  // Accepté via un élément de PERFORMER_PASSWORDS.
  assert(checkPerformerAccess('guest', parseAllowedPasswords('main', 'guest,test')).ok === true, 'liste : guest accepté')
  assert(checkPerformerAccess('backup', parseAllowedPasswords('main', 'guest, test , backup')).ok === true, 'liste : backup (avec espaces) accepté')
  // Refusé : mauvais mot de passe.
  const wrong = checkPerformerAccess('nope', parseAllowedPasswords('main', 'guest,test'))
  assert(wrong.ok === false && wrong.status === 401, 'mauvais password → 401')
  // Refusé : absent.
  const missing = checkPerformerAccess(undefined, parseAllowedPasswords('main', 'guest'))
  assert(missing.ok === false && missing.status === 401, 'password absent → 401')
  // 503 : aucun configuré (valeurs vides ignorées).
  const unconfigured = checkPerformerAccess('x', parseAllowedPasswords(undefined, ' , ,, '))
  assert(unconfigured.ok === false && unconfigured.status === 503, 'aucun password configuré → 503')

  console.log(`✅ performer password OK (multi-passwords, refus 401/503, accepté si dans la liste ; configuré=${allowed.length > 0})`)

  // Broadcast message : parsing + updatedAt serveur + store mémoire round-trip.
  const msg = parseBroadcastMessage({ type: 'track', mainTitle: 'Song', subtitle: '', url: '' })
  assert(msg.mainTitle === 'Song' && msg.type === 'track', 'message parsé')
  assert(msg.subtitle === undefined && msg.url === undefined, 'champs vides → undefined')
  assert(typeof msg.updatedAt === 'string' && msg.updatedAt.length > 0, 'updatedAt généré serveur')
  const m2 = parseBroadcastMessage({ type: 'show', mainTitle: 'Show', displayMode: 'scroll', url: 'https://x.com' })
  assert(m2.displayMode === 'scroll' && m2.url === 'https://x.com', 'displayMode + url valides')
  let threw = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: '' })
  } catch {
    threw = true
  }
  assert(threw, 'mainTitle vide → erreur')
  let badUrl = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'x', url: 'ftp://x' })
  } catch {
    badUrl = true
  }
  assert(badUrl, 'url non-http refusée')
  setBroadcastMessage(msg)
  assert(getBroadcastMessage()?.mainTitle === 'Song', 'store round-trip')
  assert(existsSync(selfcheckEnv.storePath), 'store fichier créé')
  const persisted = JSON.parse(readFileSync(selfcheckEnv.storePath, 'utf8')) as { mainTitle?: string; updatedAt?: string }
  assert(persisted.mainTitle === 'Song' && typeof persisted.updatedAt === 'string', 'store fichier contient message')
  setBroadcastMessage(null)
  assert(!existsSync(selfcheckEnv.storePath), 'store fichier supprimé si message null')

  // Visual : optionnel, clamp des nombres, filtre des couleurs, max 8, objet vide → undefined.
  const noVisual = parseBroadcastMessage({ type: 'track', mainTitle: 'NoVis' })
  assert(noVisual.visual === undefined, 'sans visual → undefined (rétro-compat)')
  const vis = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'Vis',
    visual: {
      preset: 'terminal-amber',
      visualization: 'crt-terminal',
      transition: 'flip-scramble',
      noteMode: 'static',
      scrambleDurationMs: 99999, // > max 3000 → clamp 3000
      staggerDelayMs: -5, // < min 0 → clamp 0
      pageDurationMs: 500, // < min 2000 → clamp 2000
      scrambleColors: ['#ff0000', 'nope', '#00ff00', '#123', '#0000ff', '#ffffff', '#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd', '#eeeeee'], // 9 valides + invalides → max 8
      accentColors: ['#e6c84f'],
    },
  })
  assert(vis.visual?.preset === 'terminal-amber', 'visual preset')
  assert(vis.visual?.visualization === 'crt-terminal', 'visualization crt-terminal')
  const newVisualization = parseBroadcastMessage({ type: 'track', mainTitle: 'Visual', visual: { visualization: 'event-horizon', visualDensity: 0, visualSpeed: 101, visualIntensity: -2, visualGlow: 101, visualPalette: 'ice' } })
  assert(newVisualization.visual?.visualization === 'event-horizon', 'visualization event-horizon')
  assert(newVisualization.visual?.visualDensity === 1 && newVisualization.visual?.visualSpeed === 100, 'visual controls density/speed clamp')
  assert(newVisualization.visual?.visualIntensity === 1 && newVisualization.visual?.visualGlow === 100 && newVisualization.visual?.visualPalette === 'ice', 'visual controls palette clamp')
  const shader = parseBroadcastMessage({ type: 'track', mainTitle: 'Shader', visual: { visualization: 'shader-radio', shaderPreset: 'tape-noise', shaderQuality: 'high' } })
  assert(shader.visual?.shaderPreset === 'tape-noise' && shader.visual?.shaderQuality === 'high', 'shader preset/quality persistés')
  const visualizationIds = ['split-flap', 'crt-terminal', 'ascii-wave', 'signal-scope', 'teletext', 'spectrum-waterfall', 'stereo-orbit', 'event-horizon', 'radar-transmission', 'dot-matrix', 'kinetic-type', 'tape-machine', 'constellation-radio', 'packet-stream', 'pixel-mosaic', 'analog-persistence', 'shader-radio'] as const
  for (const visualization of visualizationIds) {
    assert(parseBroadcastMessage({ type: 'track', mainTitle: visualization, visual: { visualization } }).visual?.visualization === visualization, `visualization ${visualization} acceptée`)
  }
  assert(vis.visual?.scrambleDurationMs === 3000, 'scrambleDurationMs clamp 3000')
  assert(vis.visual?.staggerDelayMs === 0, 'staggerDelayMs clamp 0')
  assert(vis.visual?.pageDurationMs === 2000, 'pageDurationMs clamp 2000')
  assert(vis.visual?.scrambleColors?.length === 8, 'scrambleColors max 8 (invalides filtrés)')
  assert(vis.visual?.scrambleColors?.[0] === '#ff0000', 'scrambleColors hex conservé')
  assert(!vis.visual?.scrambleColors?.includes('nope'), 'couleur non-hex filtrée')
  assert(vis.visual?.accentColors?.length === 1, 'accentColors')
  const emptyVis = parseBroadcastMessage({ type: 'track', mainTitle: 'EmptyVis', visual: {} })
  assert(emptyVis.visual === undefined, 'visual vide → undefined')
  let badPreset = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'x', visual: { preset: 'nope' } })
  } catch {
    badPreset = true
  }
  assert(badPreset, 'preset invalide refusé')
  let badVisualization = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'x', visual: { visualization: 'nope' } })
  } catch {
    badVisualization = true
  }
  assert(badVisualization, 'visualization invalide refusée')

  // Moteur split-flap persistant + réglages HotFX + style industriel.
  const eng = parseBroadcastMessage({ type: 'track', mainTitle: 'Eng', visual: { splitFlapEngine: 'hotfx' } })
  assert(eng.visual?.splitFlapEngine === 'hotfx', 'splitFlapEngine hotfx persisté')
  let badEngine = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'x', visual: { splitFlapEngine: 'nope' } })
  } catch {
    badEngine = true
  }
  assert(badEngine, 'splitFlapEngine invalide refusé')
  const hotfx = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'H',
    visual: {
      hotfxHeightMode: 'auto',
      noteRowsMin: 0, // < 1 → clamp 1
      noteRowsMax: 99, // > 12 → clamp 12
      hotfxDurationMs: 5, // < 30 → clamp 30
      hotfxCharacters: 'A'.repeat(200), // 200 → 120
      hotfxGridGapPx: 20, // > 12 → clamp 12
      flicker: true,
      flickerIntensity: 150, // > 100 → clamp 100
      edgeGlow: true,
      edgeGlowIntensity: 50,
      tileContrast: 60,
      panelNoise: true,
      panelDensity: 'compact',
      tileRadius: 20, // > 8 → clamp 8
      tileBorderWidth: 0, // < 1 → clamp 1
    },
  })
  assert(hotfx.visual?.hotfxHeightMode === 'auto', 'hotfxHeightMode')
  assert(hotfx.visual?.noteRowsMin === 1, 'noteRowsMin clamp 1')
  assert(hotfx.visual?.noteRowsMax === 12, 'noteRowsMax clamp 12')
  assert(hotfx.visual?.hotfxDurationMs === 30, 'hotfxDurationMs clamp 30')
  assert(hotfx.visual?.hotfxCharacters?.length === 120, 'hotfxCharacters max 120')
  assert(hotfx.visual?.hotfxGridGapPx === 12, 'hotfxGridGapPx clamp 12')
  assert(hotfx.visual?.flicker === true && hotfx.visual?.flickerIntensity === 100, 'flicker + intensity clamp')
  assert(hotfx.visual?.tileRadius === 8 && hotfx.visual?.tileBorderWidth === 1, 'tileRadius/border clamp')
  assert(hotfx.visual?.panelDensity === 'compact', 'panelDensity')
  // Fallback propre : noteRowsMax < noteRowsMin → max = min (pas de rejet).
  const rows = parseBroadcastMessage({ type: 'track', mainTitle: 'R', visual: { noteRowsMin: 8, noteRowsMax: 1 } })
  assert(rows.visual?.noteRowsMin === 8 && rows.visual?.noteRowsMax === 8, 'noteRowsMax<min → fallback max=min')
  // Alphabet vide → undefined (pas de stockage du champ).
  const emptyChars = parseBroadcastMessage({ type: 'track', mainTitle: 'C', visual: { hotfxCharacters: '' } })
  assert(emptyChars.visual === undefined, 'hotfxCharacters vide → visual vide → undefined')

  // brandLabel : trim, max 60, vide → undefined, ≠ mainTitle.
  const branded = parseBroadcastMessage({ type: 'track', mainTitle: 'Song', brandLabel: '  BLACKHOLE FM  ' })
  assert(branded.brandLabel === 'BLACKHOLE FM', 'brandLabel trim + stocké')
  assert(branded.mainTitle === 'Song', 'brandLabel ≠ mainTitle')
  const emptyBrand = parseBroadcastMessage({ type: 'track', mainTitle: 'X', brandLabel: '   ' })
  assert(emptyBrand.brandLabel === undefined, 'brandLabel vide → undefined')
  let longBrand = ''
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'X', brandLabel: 'B'.repeat(61) })
  } catch {
    longBrand = 'rejected'
  }
  assert(longBrand === 'rejected', 'brandLabel > 60 refusé')

  // layout : scales clamp, rows clamp, layout vide → undefined.
  const lay = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'L',
    visual: {
      layout: {
        titleScale: 10, // < 50 → 50
        secondaryScale: 999, // > 200 → 200
        noteScale: 90,
        tickerScale: 110,
        boardScale: 50, // < 70 → 70
        titleRows: 9, // > 3 → 3
        secondaryRows: -1, // < 0 → 0
        boardColumns: 5, // < 12 → 12
      },
    },
  })
  assert(lay.visual?.layout?.titleScale === 50, 'titleScale clamp 50')
  assert(lay.visual?.layout?.secondaryScale === 200, 'secondaryScale clamp 200')
  assert(lay.visual?.layout?.boardScale === 70, 'boardScale clamp 70')
  assert(lay.visual?.layout?.titleRows === 3, 'titleRows clamp 3')
  assert(lay.visual?.layout?.secondaryRows === 0, 'secondaryRows clamp 0')
  assert(lay.visual?.layout?.boardColumns === 12, 'boardColumns clamp 12')
  const boardColsMax = parseBroadcastMessage({ type: 'track', mainTitle: 'BC', visual: { layout: { boardColumns: 999 } } })
  assert(boardColsMax.visual?.layout?.boardColumns === 64, 'boardColumns clamp 64')
  const emptyLay = parseBroadcastMessage({ type: 'track', mainTitle: 'E', visual: { layout: {} } })
  assert(emptyLay.visual === undefined, 'layout vide → visual vide → undefined')
  let badLayoutKey = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'X', visual: { layout: { nope: 1 } } })
  } catch {
    badLayoutKey = true
  }
  assert(badLayoutKey, 'layout clé inconnue refusée (.strict)')

  // alignements : enum left/center/right stocké ; valeur invalide → rejet (.strict).
  const al = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'AL',
    visual: { layout: { brandAlign: 'right', titleAlign: 'center', secondaryAlign: 'left', noteAlign: 'right' } },
  })
  assert(al.visual?.layout?.brandAlign === 'right', 'brandAlign right stocké')
  assert(al.visual?.layout?.titleAlign === 'center', 'titleAlign center stocké')
  assert(al.visual?.layout?.secondaryAlign === 'left', 'secondaryAlign left stocké')
  assert(al.visual?.layout?.noteAlign === 'right', 'noteAlign right stocké')
  let badAlign = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'X', visual: { layout: { titleAlign: 'middle' } } })
  } catch {
    badAlign = true
  }
  assert(badAlign, 'alignement invalide refusé (enum .strict)')

  // Bandeau roulant (ticker) : vitesse clamp, direction enum, séparateur max 12, enabled bool.
  const tick2 = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'T2',
    visual: { tickerSpeedMs: 999999, tickerDirection: 'right', tickerSeparator: 'X'.repeat(40), tickerEnabled: false },
  })
  assert(tick2.visual?.tickerSpeedMs === 120000, 'tickerSpeedMs clamp 120000')
  assert(tick2.visual?.tickerDirection === 'right', 'tickerDirection stocké')
  assert(tick2.visual?.tickerSeparator?.length === 12, 'tickerSeparator max 12')
  assert(tick2.visual?.tickerEnabled === false, 'tickerEnabled false')
  const tickEmpty = parseBroadcastMessage({ type: 'track', mainTitle: 'TE', visual: { tickerSeparator: '' } })
  assert(tickEmpty.visual?.tickerSeparator === undefined, 'tickerSeparator vide → non stocké (fallback client)')
  let badDir = false
  try {
    parseBroadcastMessage({ type: 'track', mainTitle: 'X', visual: { tickerDirection: 'up' as never } })
  } catch {
    badDir = true
  }
  assert(badDir, 'tickerDirection invalide refusé')

  // Note scroll : vitesse/step clamp, loop bool.
  const sc = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'S',
    visual: { noteScrollSpeedMs: 10, noteScrollStep: 99, noteScrollLoop: true },
  })
  assert(sc.visual?.noteScrollSpeedMs === 100, 'noteScrollSpeedMs clamp 100')
  assert(sc.visual?.noteScrollStep === 8, 'noteScrollStep clamp 8')
  assert(sc.visual?.noteScrollLoop === true, 'noteScrollLoop stocké')
  // Anciens messages sans ticker/scroll restent valides.
  const old = parseBroadcastMessage({ type: 'track', mainTitle: 'OLD' })
  assert(old.visual === undefined && old.brandLabel === undefined, 'ancien message sans visual/brandLabel valide')
  console.log('✅ broadcast message OK (parse, updatedAt serveur, store mémoire+fichier, visual clamp/filter, engine+hotfx+style, brandLabel+layout, ticker+scroll)')
  rmSync(selfcheckEnv.storeDir, { recursive: true, force: true })
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
