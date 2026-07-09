// Self-check US-1.3 : signe un token performer + listener, vérifie les grants.
// Lance : npm run selfcheck (depuis server/) ou `tsx server/src/selfcheck.ts` (racine).
import { TokenVerifier } from 'livekit-server-sdk'
import { createToken } from './livekit.js'
import { config } from './config.js'
import { checkPerformerAccess, parseAllowedPasswords } from './performerAuth.js'
import { getBroadcastMessage, parseBroadcastMessage, setBroadcastMessage } from './broadcastMessage.js'

function assert(cond: boolean, label: string): void {
  if (!cond) {
    console.error('❌ échec :', label)
    process.exit(1)
  }
}

async function main(): Promise<void> {
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

  console.log('✅ token grants OK (performer publish+subscribe, listener subscribe-only)')
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
  setBroadcastMessage(null)

  // Visual : optionnel, clamp des nombres, filtre des couleurs, max 8, objet vide → undefined.
  const noVisual = parseBroadcastMessage({ type: 'track', mainTitle: 'NoVis' })
  assert(noVisual.visual === undefined, 'sans visual → undefined (rétro-compat)')
  const vis = parseBroadcastMessage({
    type: 'track',
    mainTitle: 'Vis',
    visual: {
      preset: 'terminal-amber',
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
  console.log('✅ broadcast message OK (parse, updatedAt serveur, store mémoire, visual clamp/filter)')
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})