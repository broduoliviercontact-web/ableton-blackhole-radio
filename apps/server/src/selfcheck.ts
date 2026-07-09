// Self-check US-1.3 : signe un token performer + listener, vérifie les grants.
// Lance : npm run selfcheck (depuis server/) ou `tsx server/src/selfcheck.ts` (racine).
import { TokenVerifier } from 'livekit-server-sdk'
import { createToken } from './livekit.js'
import { config } from './config.js'
import { checkPerformerAccess } from './performerAuth.js'

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

  // Mot de passe performer : accepté si correct, refusé sinon, 503 si non configuré.
  assert(checkPerformerAccess('secret', 'secret').ok === true, 'performer password correct accepté')
  const wrong = checkPerformerAccess('secret', 'other')
  assert(wrong.ok === false && wrong.status === 401, 'performer password incorrect → 401')
  const missing = checkPerformerAccess(undefined, 'secret')
  assert(missing.ok === false && missing.status === 401, 'performer password absent → 401')
  const unconfigured = checkPerformerAccess('secret', undefined)
  assert(unconfigured.ok === false && unconfigured.status === 503, 'serveur non configuré → 503')

  console.log('✅ token grants OK (performer publish+subscribe, listener subscribe-only)')
  console.log(`✅ performer password OK (refus 401/503, accepté si correct ; configuré=${Boolean(config.PERFORMER_PASSWORD)})`)
}

main().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})