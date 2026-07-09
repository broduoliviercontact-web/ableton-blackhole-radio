// Self-check US-1.3 : signe un token performer + listener, vérifie les grants.
// Lance : npm run selfcheck (depuis server/) ou `tsx server/src/selfcheck.ts` (racine).
import { TokenVerifier } from 'livekit-server-sdk'
import { createToken } from './livekit.js'
import { config } from './config.js'
import { checkPerformerAccess, parseAllowedPasswords } from './performerAuth.js'

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
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})