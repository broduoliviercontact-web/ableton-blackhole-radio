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
3. **Choisis une entrée audio** → liste toutes les entrées du Mac. Une entrée virtuelle
   (BlackHole, Loopback) est présélectionnée si détectée, sinon la première entrée.
   Tu peux choisir n’importe laquelle : micro intégré, carte son, BlackHole, Loopback…
   - Si la source ressemble à un micro intégré, une note non bloquante rappelle de
     sélectionner une entrée virtuelle pour Ableton.
4. **Start local capture** → le VU-mètre doit bouger au son de ta source.
5. **Start broadcast** → la section 4 affiche `Source active : <device>` puis
   `connecting → connected → publishing → live`, avec `room : main`,
   `identity : performer`, `track : ableton-blackhole-audio`.

### Cas Ableton avec BlackHole

Pour envoyer la sortie d’Ableton vers le navigateur :

1. Installe **BlackHole 2ch** (https://existential.audio/blackhole) et redémarre macOS.
2. Dans Ableton : Preferences → Audio → *Audio Output Device* = **BlackHole 2ch**
   (ou un Multi-Output Device macOS contenant BlackHole + ta carte son).
3. Sur `/performer`, choisis **BlackHole 2ch** comme entrée, capture puis broadcast.

## Listener

1. Ouvre `http://localhost:5173/listen` (autre onglet ou autre navigateur/machine).
2. **Listen live** → `connecting → connected`.
   - Si aucun performer n’est live : « Connecté à la room. En attente du performer. »
3. Si le navigateur bloque l’autoplay, clique le bouton **« Autoriser la lecture audio »** (StartAudio).
4. Tu entends l’audio d’Ableton. Statut `listening`, « 🎧 En écoute — 1 piste audio reçue ».
5. **Stop listening** → `disconnected`.

## Problèmes fréquents

| Symptôme | Cause / action |
|----------|----------------|
| VU-mètre à 0 | Ableton ne sort pas vers BlackHole (vérifie l’Audio Output Device), ou clip arrêté, ou mauvaise entrée sélectionnée. |
| BlackHole absent de la liste | BlackHole non installé / macOS pas redémarré. Réinstalle, redémarre, **Rafraîchir**. |
| Permission micro refusée | Autorise l’accès dans les réglages du navigateur (icône cadenas). |
| `Connexion LiveKit échouée` + « valeurs factices » | `.env` contient encore `*.example.com`. Renseigne un vrai `LIVEKIT_URL`/`KEY`/`SECRET` puis relance `dev:server`. |
| `Connexion LiveKit échouée` (URL réelle) | Serveur LiveKit injoignable / clé ou secret invalides / token expiré. Vérifie `LIVEKIT_API_KEY`/`SECRET`, que le serveur tourne, et le réseau. |
| Audio listener muet alors que `listening` | Volume navigateur à 0, onglet muet, ou `RoomAudioRenderer` pas de piste. Vérifie que le performer est bien `live`. |
| Autoplay bloqué (rien ne sort) | Clique **« Autoriser la lecture audio »** (StartAudio). Un geste utilisateur est requis par la politique autoplay. |
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