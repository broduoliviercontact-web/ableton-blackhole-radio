# Test terrain — LiveKit avec une entrée audio Mac

Procédure manuelle pour valider la chaîne complète avec un vrai serveur LiveKit.
L’app diffuse **n’importe quelle entrée audio** du Mac (micro intégré, carte son,
BlackHole, Loopback ou autre virtuel) ; BlackHole n’est qu’un cas d’usage recommandé
pour envoyer Ableton vers le navigateur.

## Pré-requis

- Une **entrée audio** à diffuser : micro intégré, carte son USB, ou entrée virtuelle
  (BlackHole 2ch https://existential.audio/blackhole, Loopback de Rogue Amoeba…).
- **Vrai projet LiveKit** : LiveKit Cloud (clé de projet) ou serveur self-hosted.
- `.env` renseigné avec de **vraies** valeurs :
  ```
  LIVEKIT_URL=wss://<ton-serveur>        # PAS *.example.com
  LIVEKIT_API_KEY=<ta clé>
  LIVEKIT_API_SECRET=<ton secret>
  PORT=3001
  ```
- Lancer :
  ```bash
  npm run dev:server   # http://localhost:3001
  npm run dev:web      # http://localhost:5173
  ```
- Navigateur : Chrome recommandé. `getUserMedia` exige un contexte sécurisé :
  `localhost` passe en dev ; en prod il faut HTTPS.

> Vérification rapide : sur `/performer` ou `/listen`, section **Debug → Check server config**.
> `URL factice détectée : non` + les trois `oui` = config OK.

## Performer

1. Ouvre `http://localhost:5173/performer`.
2. **Autoriser l’audio** → accepte la permission micro.
3. **Choisis la source audio** → liste toutes les entrées du Mac. Une entrée virtuelle
   (BlackHole, Loopback) est présélectionnée si détectée, sinon la première entrée.
   Tu peux choisir n’importe laquelle : micro intégré, carte son, BlackHole, Loopback…
   - Si la source ressemble à un micro intégré, une note non bloquante rappelle de
     sélectionner une entrée virtuelle pour Ableton.
4. **Start local capture** → le **VU source** (« Niveau source ») doit bouger au son
   de ta source.
5. Règle le **Volume master envoyé aux auditeurs** (fader 0–100 %, défaut 100 %).
6. **Start broadcast** → la section 4 affiche `Source active : <device>` puis
   `connecting → connected → publishing → live`, avec `room : main`,
   `identity : performer`, `track : mac-audio-input`. Le **VU sortie broadcast**
   (« Niveau envoyé aux auditeurs ») apparaît et reflète le signal post-fader.

### Fader master (VU source vs VU sortie broadcast)

- Fader à **100 %** → le VU sortie broadcast est au niveau du VU source.
- Fader à **50 %** (réglable en direct pendant le broadcast) → le VU sortie broadcast
  baisse, le VU source ne change pas.
- Fader à **0 %** → le VU sortie broadcast tombe à 0 (mute), la connexion reste
  `live`, le VU source continue de bouger.
- Retour à **100 %** → le VU sortie broadcast remonte au niveau source.

### Cas Ableton avec BlackHole ou Loopback

Pour envoyer la sortie d’Ableton vers le navigateur :

1. Installe une entrée audio virtuelle : **BlackHole 2ch**
   (https://existential.audio/blackhole) ou **Loopback** (Rogue Amoeba). Redémarre macOS.
2. Dans Ableton : Preferences → Audio → *Audio Output Device* = l’entrée virtuelle
   (BlackHole 2ch, ou un Multi-Output Device macOS contenant BlackHole + ta carte son).
3. Sur `/performer`, choisis cette entrée virtuelle comme source, capture puis broadcast.

## Listener

1. Ouvre `http://localhost:5173/listen` (autre onglet ou autre navigateur/machine).
2. **Listen live** → `connecting → connected`.
   - Si aucun performer n’est live : « Connecté à la room. En attente du performer. »
3. Si le navigateur bloque l’autoplay, clique le bouton **« Autoriser la lecture audio »**.
4. Tu entends l’audio. Statut `listening`, « 🎧 En écoute — flux audio reçu ».
5. **Stop listening** → `disconnected`, room nettoyée.

## Stop & cleanup

- **Stop broadcast** → `disconnected`, AudioContext fermé, VU sortie broadcast coupé.
  Le VU source reste actif tant que la capture locale tourne.
- **Stop local capture** (pendant un broadcast) → broadcast stoppé proprement, puis
  capture stoppée. Tout se nettoie.
- Reconnexion listener : en cas de perte, 3 tentatives auto (backoff 1s/2s/4s) ; le
  bouton **Reconnect** n’apparaît qu’après épuisement des tentatives.

## Problèmes fréquents

| Symptôme | Cause / action |
|----------|----------------|
| Aucun device audio | Aucune entrée détectée. Branche une source / redémarre le navigateur / **Rafraîchir**. |
| VU source à 0 | Mauvaise source sélectionnée, ou la source ne reçoit pas de signal (clip arrêté, sortie DAW non routée vers l’entrée virtuelle). |
| VU source OK mais son faible côté listener | Mauvais gain côté DAW ou interface audio (Ableton/master trop bas, gain d’entrée trop faible). Monte la source — ne compense pas avec le fader (max 100 % = niveau source). |
| Broadcast impossible (Start désactivé) | Démarre d’abord la capture locale. Vérifie `connected`/`live` dans le statut. |
| `Connexion LiveKit échouée` + « valeurs factices » | `.env` contient encore `*.example.com`. Renseigne un vrai `LIVEKIT_URL`/`KEY`/`SECRET` puis relance `dev:server`. |
| `Connexion LiveKit échouée` (URL réelle) | Serveur LiveKit injoignable / clé ou secret invalides / token expiré. Vérifie `LIVEKIT_API_KEY`/`SECRET`, que le serveur tourne, et le réseau. |
| Listener muet alors que `listening` | Volume navigateur à 0, onglet muet, ou performer pas `live`. Vérifie que le performer diffuse et que le fader n’est pas à 0 %. |
| Autoplay bloqué (rien ne sort) | Clique **« Autoriser la lecture audio »**. Un geste utilisateur est requis par la politique autoplay. |
| `OverconstrainedError` à la capture | Le device ne supporte pas `sampleRate: 48000`/`channelCount: 2`. Retire ces contraintes dans `useLocalAudioCapture` ou passe en `ideal`. |

## Vérifications serveur (terminal)

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/config-check
curl -X POST http://localhost:3001/api/token \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"main","identity":"performer","role":"performer"}'
npm run selfcheck:server
```