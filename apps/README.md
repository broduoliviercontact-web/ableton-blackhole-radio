# Mac Audio Input Broadcaster

Application React/Node TypeScript permettant de diffuser une entrée audio Mac
vers des auditeurs web via LiveKit. BlackHole/Loopback restent recommandés pour
router la sortie d'un DAW (Ableton) vers le navigateur.

## Flux

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
npm install
```

## Configuration

Copier `.env.example` vers `.env` et renseigner :

```
LIVEKIT_URL       # wss://<ton-serveur> (PAS *.example.com)
LIVEKIT_API_KEY
LIVEKIT_API_SECRET  # serveur uniquement, jamais côté frontend
PORT              # backend (défaut 3001)
```

## Lancement

```bash
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
npm run selfcheck:web      # utils web (devices, identity)
npm run build:web          # tsc -b + vite build
npm run typecheck:server   # tsc serveur
npm run selfcheck:server   # grants token
```

## Vérifier le backend

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/config-check   # booléens (aucun secret)
curl -X POST http://localhost:3001/api/token \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"main","identity":"performer-test","role":"performer"}'
```

## Sécurité

- Ne jamais exposer `LIVEKIT_API_SECRET` côté frontend.
- `.env` n'est pas committé (voir `.gitignore`). Le frontend ne reçoit qu'un
  token JWT signé éphémère.

## Test terrain

Voir [`docs/manual-test-mac-audio-input-livekit.md`](docs/manual-test-mac-audio-input-livekit.md).

## Docs BMAD

`docs/bmad/` — brief, prd, architecture, stories, definition-of-done.