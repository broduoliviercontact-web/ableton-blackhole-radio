# Mac Audio Input Broadcaster

Diffusion d’une entrée audio du Mac (micro intégré, carte son, BlackHole, Loopback…)
vers des navigateurs via LiveKit. BlackHole reste recommandé pour envoyer Ableton.

Monorepo :
- `web/` — frontend React + Vite + TypeScript (`/performer`, `/listen`)
- `server/` — backend Node + Express + TypeScript (tokens LiveKit uniquement)

## Démarrage local

```bash
# 1. Dépendances (déjà installées à la racine du monorepo)
npm install

# 2. Env
cp .env.example .env
# renseigne LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET

# 3. Lance backend + frontend
npm run dev:server   # http://localhost:3001
npm run dev:web      # http://localhost:5173
# ou les deux : npm run dev
```

Ouvrir http://localhost:5173/performer et http://localhost:5173/listen.

> `getUserMedia` exige un contexte sécurisé : `localhost` passe en dev.
> En production, servir en **HTTPS** et définir `VITE_API_BASE`.

## Vérifier le backend

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/config-check   # booléens de config (aucun secret)
curl -X POST http://localhost:3001/api/token \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"main","identity":"performer-test","role":"performer"}'

# Self-check des grants token (sans serveur LiveKit réel) :
npm run selfcheck:server
```

## Test terrain (vrai LiveKit + entrée audio Mac)

Voir [`docs/manual-test-mac-audio-input-livekit.md`](docs/manual-test-mac-audio-input-livekit.md).

## Sécurité

`LIVEKIT_API_SECRET` n'est lu que côté serveur. Le frontend ne reçoit qu'un
token JWT signé éphémère.

## Docs BMAD

`docs/bmad/` — brief, prd, architecture, stories, definition-of-done.