# Stories — Mac Audio Input Broadcaster

Convention : US-<lot>.<num>. Une story = un commit petit et lisible.
Ne coder que le **Lot 1** après validation de l'architecture.

## Lot 1 — Squelette & API token

> Objectif : backend qui tourne, endpoint token qui signe, frontend qui
> appelle l'API. Aucune capturation audio encore.

### US-1.1 — Scaffolding backend
- Créer `apps/server/` (package.json, tsconfig, `src/index.ts`).
- Express + CORS (localhost:5173) + `dotenv`.
- `GET /api/health` → `{ status: "ok" }`.
- Script `dev:server` : `tsx watch src/index.ts`.
- **DoD** : `curl localhost:3001/api/health` → 200 `{status:"ok"}`.

### US-1.2 — Config + validation env (zod)
- `src/config.ts` : charge `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
  `LIVEKIT_API_SECRET`, `PORT` via zod. Échec clair si manquant.
- **DoD** : démarrage sans `LIVEKIT_API_SECRET` → message d'erreur explicite,
  process exit.

### US-1.3 — Endpoint token
- `src/livekit.ts` : `createToken(role, identity)` → `{ token, url }`.
- `src/routes/token.ts` : `POST /api/token`, body validé zod
  `{ role: "performer"|"listener", identity: string }`.
- grants conformes PRD (FR-22).
- **DoD** : `POST /api/token {role:"performer",identity:"p1"}` → 200 avec
  token décodable (vérifier `canPublish:true` côté LiveKit ou via
  `livekit-server-sdk` decode).

### US-1.4 — `.env.example` + scripts racine
- `.env.example` avec toutes les vars (PRD §5).
- `apps/package.json` : scripts `dev:web`, `dev:server`, `dev`.
- **DoD** : `cp .env.example .env` + `npm run dev` lance web+server.

### US-1.5 — UI squelette frontend
- `App.tsx` route par `pathname` → `Performer` / `Listen`.
- Pages vides avec titre + placeholder + `lib/api.ts` (`fetchToken`).
- Vérif que `fetchToken("listener","l1")` répond depuis le navigateur.
- **DoD** : `/performer` et `/listen` s'affichent, appel API OK (network tab).

## Lot 2 — Capturer performer + publier

> Objectif : lister les entrées audio, en choisir une, vumètre, publier dans
> LiveKit. L'entrée est au choix de l'utilisateur ; une entrée virtuelle
> (BlackHole/Loopback) est présélectionnée si détectée.

### US-2.1 — Énumération + sélection device
- `lib/audio.ts` : `getAudioDevices()` via `enumerateDevices` (post-permission).
- `AudioDeviceSelect.tsx` : liste filtrée `audioinput`, sélection au choix.
  Présélection BlackHole > Loopback > première entrée disponible.
- Message "aucun device" si vide.
- **DoD** : après permission, les entrées audio apparaissent et sont
  sélectionnables ; aucune entrée n'est imposée.

### US-2.2 — getUserMedia avec constraints brutes
- `lib/audio.ts` : `startCapture(deviceId)` → `MediaStream` avec
  `echoCancellation/noiseSuppression/autoGainControl: false`,
  `deviceId: { exact }` (l'entrée choisie).
- Gestion permission refusée → message clair.
- **DoD** : console affiche le track audio, labels sans traitement.

### US-2.3 — Vumètre local
- `VUMeter.tsx` (→ `AudioMeter.tsx`) : `AnalyserNode` +
  `requestAnimationFrame`, barre 0–100%.
- Branché sur le stream capturé.
- **DoD** : la barre bouge au son de la source choisie.

### US-2.4 — Connexion LiveKit + publish
- `Performer.tsx` : Start → `fetchToken("performer", identity)` →
  `room.connect` → publication du track audio capturé.
- Stop → unpublish + disconnect propre.
- Affichage « Source active : <device> ». Note douce non bloquante si la source
  ressemble à un micro intégré (suggère une entrée virtuelle pour Ableton).
- Pas de gate BlackHole : la diffusion démarre avec n'importe quelle entrée.
- Gestion échec connexion LiveKit → message clair + retour idle.
- **DoD** : démarrage publie 1 track audio dans la room (vu LiveKit
  dashboard / `room.localParticipant.audioTrackPublications`).

## Lot 3 — Auditeur

### US-3.1 — Subscribe + lecture
- `Listen.tsx` : `fetchToken("listener", identity)` → `room.connect`
  (subscribe-only). `room.on("trackSubscribed")` → attach `<audio>`.
- Lecture auto (gestion autoplay policy : mute-first si bloqué, ou user
  gesture).
- **DoD** : avec un performeur en cours, l'auditeur entend le son.

### US-3.2 — Statut live/offline
- `StatusBadge.tsx` : connecting / live / offline via events room.
- **DoD** : badge reflète l'état réel (déconnexion → offline).

## Lot 3B — Validation terrain + config-check

### US-3B.1 — Endpoint config-check
- `GET /api/config-check` → booléens (URL/key/secret configurés, URL factice
  détectée), aucun secret renvoyé.
- **DoD** : `curl /api/config-check` renvoie des booléens, jamais la clé/secret.

### US-3B.2 — Détection config factice côté frontend
- Message dédié si l'URL LiveKit ressemble à `*.example.com`.
- **DoD** : connexion à une URL factice → message clair pointant vers .env.

## Lot 4 — Robustesse & polish

### US-4.1 — Gestion d'erreur complète
- Tous les cas PRD §4 couverts avec messages exacts.
- Reconnexion auto du listener (backoff simple, 3 tentatives).
- **DoD** : scénarios d'erreur testés manuellement, message correct chacun.

### US-4.2 — Identity unique + optimisations
- Identity performer/listener stable par session (sessionStorage).
- VU-mètre sans re-render React (refs DOM directs).
- Code-split `Performer`/`Listen` (React.lazy).
- **DoD** : identity persiste au rechargement d'onglet ; bundle sans warning
  >500KB sur la chunk initiale.

### US-4.3 — Tests minimaux (self-checks)
- `selfcheck:server` (grants token) + `selfcheck:web` (isBlackHole,
  isLoopback, pickPreferredAudioInput, looksLikeBuiltInMic, identity).
- **DoD** : `npm run selfcheck:server` et `npm run selfcheck:web` passent.

### US-4.4 — Docs README + manuel de test
- README monorepo : setup, `npm run dev`, config LiveKit, prod HTTPS.
- Manuel de test : cas Ableton avec BlackHole/Loopback + autres entrées.
- **DoD** : un nouveau dev démarre en < 10 min ; BlackHole présenté comme
  recommandation, pas obligation.