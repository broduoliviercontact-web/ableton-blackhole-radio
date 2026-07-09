# Mac Audio Input Broadcaster

Application web React/Node TypeScript pour diffuser en direct une entrée audio
Mac vers des auditeurs web avec LiveKit/WebRTC. Pensé pour les musiciens qui
veulent envoyer la sortie de leur DAW (Ableton, et autres) vers un public
distinct via un simple lien.

React · Vite · TypeScript · Node · Express · LiveKit · WebRTC · Vercel · Render

## Démo

Le projet est déployé en production :

- **Page radio publique** (split-flap) — https://ableton-blackhole-radio.vercel.app/ (alias `/listen`)
- **Performer** (caché, protégé par mot de passe) — https://ableton-blackhole-radio.vercel.app/performer
- **Backend health** — https://ableton-blackhole-radio.onrender.com/api/health
- **Config check** — https://ableton-blackhole-radio.onrender.com/api/config-check

## Fonctionnalités

- Sélection d’une entrée audio Mac (micro intégré, carte son, ou entrée virtuelle)
- Capture locale via `getUserMedia` (sans traitement : flux brut)
- VU-mètre de niveau source
- Fader master 0–100 % (0 = mute du broadcast, 100 = niveau original, réglable en direct)
- VU-mètre post-fader / sortie broadcast
- Diffusion LiveKit (WebRTC)
- **Page radio publique split-flap** : titre, métadonnées (sous-titre · artiste ·
  album), note paginée (cycle 6 s) et ticker défilant — look affichage gare,
  `prefers-reduced-motion` respecté.
- **Volume listener local** 0–100 % (mute, jamais de boost — affecte seulement
  l'écoute locale, pas le broadcast ni LiveKit).
- Reconnexion listener simple (3 tentatives, backoff 1s/2s/4s)
- Config-check serveur (booléens uniquement, aucun secret exposé)
- Tokens LiveKit signés côté backend — le secret ne quitte jamais le serveur
- **Diffusion protégée par mot de passe** : seuls les performers authentifiés
  obtiennent un token `canPublish`. Les listeners restent publics.
- **Messages radio** : le performer publie un message (titre, artiste/album,
  note, ticker) affiché sur la page publique ; les listeners récupèrent le
  message courant par polling.

## Flux audio

```
Entrée audio Mac
    → Performer
    → VU source
    → Fader master
    → VU sortie broadcast
    → LiveKit Cloud
    → Listener
```

> Pour Ableton, on peut utiliser **BlackHole** ou **Loopback** pour envoyer la
> sortie du DAW vers le navigateur. C’est une option, pas une obligation :
> n’importe quelle entrée audio Mac fonctionne.

## Screenshots

- `docs/screenshots/performer.png`
- `docs/screenshots/listener.png`

_À ajouter : capture Performer et Listener._

## Architecture

```
Vercel (Vite/React)   ──token──►   Render (Express)   ──signe──►   LiveKit Cloud
      │                                   │                            │
   /performer                          /api/token                   transport audio
   /listen                         /api/health, /config-check            │
      └──────────────  WebRTC audio via LiveKit  ───────────────────────┘
```

- **Frontend** Vite/React sur Vercel — UI performer + listener.
- **Backend** Express sur Render — ne transporte **pas** l’audio. Il signe les
  tokens LiveKit et expose health / config-check.
- **LiveKit Cloud** transporte l’audio (WebRTC SFU).
- **`LIVEKIT_API_SECRET`** reste côté serveur. Le frontend ne reçoit qu’un token
  JWT signé éphémère.
- **`PERFORMER_PASSWORD`** (serveur uniquement) protège la génération des tokens
  `canPublish` : un performer doit le saisir pour broadcaster. Les listeners
  n’ont pas besoin de mot de passe. **`PERFORMER_PASSWORDS`** (optionnel, séparés
  par virgule) permet d’ajouter plusieurs mots de passe. Aucun n’est jamais
  exposé côté frontend.

## Installation locale

```bash
git clone https://github.com/broduoliviercontact-web/ableton-blackhole-radio.git
cd ableton-blackhole-radio/apps
npm install
```

### Configuration

Copier `apps/.env.example` vers `apps/.env` et renseigner :

```
LIVEKIT_URL         # wss://<ton-projet>.livekit.cloud
LIVEKIT_API_KEY     # clé du projet LiveKit
LIVEKIT_API_SECRET  # serveur uniquement, jamais côté frontend
PORT                # backend (défaut 3001)
WEB_ORIGIN          # origine frontend en prod (CORS) — optionnel en dev
PERFORMER_PASSWORD  # protège les tokens performer (canPublish) — requis en prod
PERFORMER_PASSWORDS  # optionnel : plusieurs mots de passe séparés par virgule
```

### Lancement

```bash
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:5173
# ou les deux : npm run dev
```

URLs locales : http://localhost:5173/performer · http://localhost:5173/listen

> `getUserMedia` exige un contexte sécurisé : `localhost` passe en dev.

### Checks

```bash
npm run selfcheck:web      # utils web (devices, identity)
npm run build:web          # tsc -b + vite build
npm run typecheck:server   # tsc serveur
npm run selfcheck:server   # grants token
```

## Déploiement

Le déploiement (Vercel + Render + LiveKit Cloud) est documenté dans
[`apps/docs/deploy.md`](apps/docs/deploy.md).

## Messages radio

Le performer publie un message radio (titre principal, sous-titre, artiste,
album, note longue, ticker, URL) depuis `/performer` → `POST /api/broadcast-message`
(protégé par `PERFORMER_PASSWORD`). La page publique `/` récupère le message
courant via `GET /api/broadcast-message` (polling 5 s) et l'affiche en 4 zones
(titre, métadonnées, note, ticker). Le message par défaut s'affiche tant
qu'aucun message n'est publié.

> MVP : le message est stocké **en mémoire** côté serveur — il est perdu au
> redémarrage de Render. L'affichage split-flap est rendu en HTML/CSS, sans
> dépendance externe. Plus tard : Supabase / Redis / LiveKit room metadata.

## Sécurité

- `LIVEKIT_API_SECRET` n’est jamais exposé côté frontend.
- `.env` n’est pas committé (voir `apps/.gitignore`).
- CORS limité à `localhost` (dev) + `WEB_ORIGIN` (prod), pas de wildcard.

## Crédits / cas Ableton

Pour router la sortie d’un DAW vers une entrée virtuelle macOS :
- [BlackHole](https://existential.audio/blackhole) (gratuit)
- [Loopback](https://rogueamoeba.com/loopback/) (Rogue Amoeba)

Ces outils sont indépendants du projet et optionnels.

## Documentation

- [`apps/docs/deploy.md`](apps/docs/deploy.md) — déploiement
- [`apps/docs/manual-test-radio-production.md`](apps/docs/manual-test-radio-production.md) — checklist de test radio en production
- [`apps/docs/manual-test-mac-audio-input-livekit.md`](apps/docs/manual-test-mac-audio-input-livekit.md) — test terrain
- [`apps/docs/bmad/`](apps/docs/bmad) — notes de conception