# PRD — Mac Audio Input Broadcaster

## 1. Personas

### Performeur
- Contexte : macOS, une entrée audio à diffuser (micro intégré, carte son, ou
  entrée virtuelle type BlackHole/Loopback pour router un DAW).
- But : diffuser sa source audio vers le web.
- Douleur à éviter : config complexe, latence, sons traités/tronqués,
  obligation d'installer un outil spécifique pour diffuser.

### Auditeur
- Contexte : navigateur récent, lien `/listen`.
- But : écouter en direct.
- Ne configure rien.

## 2. Exigences fonctionnelles

### 2.1 Page `/performer`
- **FR-1** Lister **toutes** les entrées audio disponibles
  (`enumerateDevices` après permission).
- **FR-2** Permettre la sélection explicite de n'importe quelle entrée. Par
  défaut une entrée virtuelle (BlackHole > Loopback) est présélectionnée si
  détectée, sinon la première entrée disponible. Aucune entrée n'est imposée :
  la diffusion est possible avec n'importe quelle source.
- **FR-3** Bouton **Start Broadcast** / **Stop**.
- **FR-4** Vumètre local (mesure du niveau sur le flux capturé), mis à jour via
  `requestAnimationFrame`/AnalyserNode.
- **FR-5** Connexion à LiveKit comme **publisher** (canPublish=true).
- **FR-6** Contraintes getUserMedia :
  ```ts
  { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, deviceId: { exact: selectedDeviceId } } }
  ```
- **FR-7** Statut visible : idle / requesting-permission / broadcasting / error.
- **FR-8** Affichage de la source active (« Source active : <device> »). Si la
  source ressemble à un micro intégré, note non bloquante suggérant une entrée
  virtuelle (BlackHole/Loopback) pour le cas Ableton.

### 2.2 Page `/listen`
- **FR-10** Connexion à la même room LiveKit comme **subscriber**
  (canSubscribe=true, canPublish=false).
- **FR-11** Lecture automatique des pistes audio reçues (attach au
  `<audio>` élément).
- **FR-12** Statut : live / offline / connecting.

### 2.3 Backend `apps/server`
- **FR-20** `GET /api/health` → `{ status: "ok" }`.
- **FR-21** `POST /api/token` body `{ role: "performer" | "listener", identity: string }`
  → `{ token, url }`.
- **FR-22** Token généré via `livekit-server-sdk` (`AccessToken`).
  - performer : `canPublish: true, canSubscribe: true`
  - listener : `canPublish: false, canSubscribe: true`
- **FR-23** `LIVEKIT_API_SECRET` lu serveur-side uniquement, jamais renvoyé.
- **FR-24** `GET /api/config-check` → booléens de config (aucun secret/URL
  renvoyée), pour diagnostiquer une config LiveKit incomplète ou factice.

## 3. Exigences non-fonctionnelles

- **NFR-1** Fonctionne en local sur `localhost` (dev).
- **NFR-2** Production en HTTPS (contexte sécurisé requis par getUserMedia).
- **NFR-3** Aucune dépendance ajoutée pour ce qu'une ligne de code fait.
- **NFR-4** Latence cible < 1s performer→auditeur (limite WebRTC/LiveKit).
- **NFR-5** Pas de serveur de transport audio : tout passe en P2P/SFU LiveKit.

## 4. Gestion d'erreur (messages clairs)

Cas obligatoires avec message utilisateur explicite :

| Cas | Message |
|-----|---------|
| Aucun device audio | "Aucun périphérique audio détecté." |
| Permission micro refusée | "Permission micro refusée. Autorisez l'accès dans le navigateur." |
| Connexion LiveKit échouée (URL factice) | "Connexion LiveKit échouée. Renseignez un vrai LIVEKIT_URL dans .env." |
| Connexion LiveKit échouée (URL réelle) | "Échec de connexion au serveur LiveKit. Réessayez." |
| Token invalide / 4xx | "Session invalide. Rechargez la page." |

Note : BlackHole n'est jamais présenté comme une erreur. Une source qui
ressemble à un micro intégré déclenche seulement une note douce non bloquante
(cf. FR-8), pas un blocage de la diffusion.

## 5. Variables d'environnement (cf. `.env.example`)

- `LIVEKIT_URL` — URL du serveur LiveKit (wss://…).
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET` — serveur uniquement.
- `PORT` — port du backend (default 3001).
- `VITE_API_BASE` — URL du backend pour le frontend.

## 6. Lots (cf. stories.md)

- Lot 1 : scaffolding + health + token + UI squelette.
- Lot 2 : capture performer + vumètre + publish.
- Lot 3 : listener subscribe + lecture.
- Lot 3B : validation terrain + config-check.
- Lot 4 : robustesse & polish (identity unique, reconnexion listener, VU-mètre
  optimisé, code-split, tests minimaux).
- Changement de direction : BlackHole passe de contrainte à recommandation.