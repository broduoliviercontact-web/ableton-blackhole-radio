# Mac Audio Input Broadcaster

Application React/Node TypeScript pour diffuser une entrée audio Mac vers des
auditeurs web via LiveKit (WebRTC). Le backend signe des tokens LiveKit ; le
transport audio passe par LiveKit Cloud. BlackHole/Loopback restent recommandés
pour router la sortie d'un DAW (Ableton) vers le navigateur.

## Flux audio

```
Entrée audio Mac → Performer → VU source → Fader master → VU sortie broadcast → LiveKit → Listener
```

## Prérequis

- Node
- LiveKit Cloud ou un serveur LiveKit self-hosted
- Navigateur compatible `getUserMedia` (Chrome recommandé ; contexte sécurisé requis)
- Une entrée audio Mac (micro intégré, carte son, ou entrée virtuelle)
- Optionnel : BlackHole ou Loopback pour envoyer Ableton vers le navigateur

## Installation

```bash
cd apps
npm install
```

## Configuration .env

Copier `apps/.env.example` vers `apps/.env` et renseigner :

```
LIVEKIT_URL         # wss://<ton-serveur> (PAS *.example.com)
LIVEKIT_API_KEY
LIVEKIT_API_SECRET  # serveur uniquement, jamais côté frontend
PORT                # backend (défaut 3001)
WEB_ORIGIN          # origine frontend en prod (CORS) — optionnel en dev
```

## Lancement local

```bash
cd apps
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:5173
# ou les deux : npm run dev
```

## URLs

- Performer : http://localhost:5173/performer
- Listener : http://localhost:5173/listen

> `getUserMedia` exige un contexte sécurisé : `localhost` passe en dev.
> En production, servir en **HTTPS** et définir `VITE_API_BASE`.

## Checks

```bash
cd apps
npm run selfcheck:web      # utils web (devices, identity)
npm run build:web          # tsc -b + vite build
npm run typecheck:server   # tsc serveur
npm run selfcheck:server   # grants token
```

## Sécurité

- Ne jamais exposer `LIVEKIT_API_SECRET` côté frontend.
- `.env` n'est pas committé (voir `apps/.gitignore`). Le frontend ne reçoit qu'un
  token JWT signé éphémère.
- CORS : `localhost:5173` en dev + `WEB_ORIGIN` en prod. Pas de wildcard.

## Déploiement à venir

Frontend Vercel + backend Render + LiveKit Cloud. Procédure détaillée dans
[`apps/docs/deploy.md`](apps/docs/deploy.md).