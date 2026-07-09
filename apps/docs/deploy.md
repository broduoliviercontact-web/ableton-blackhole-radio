# Déploiement

Deux services + LiveKit Cloud pour le transport audio :

- **Backend** (Node/Express) → [Render](https://render.com) Web Service
- **Frontend** (Vite/React) → [Vercel](https://vercel.com)
- **Transport audio** → LiveKit Cloud (inchangé, déjà utilisé en dev)

Le backend ne transporte pas l'audio : il signe seulement les tokens LiveKit.
Aucune variable secrète n'est exposée côté frontend.

## Backend — Render (Web Service)

Créer un **Web Service** depuis le repo GitHub.

| Paramètre | Valeur |
|-----------|--------|
| Root Directory | `apps` |
| Runtime | Node |
| Build Command | `npm install && npm run build:server` |
| Start Command | `npm run start:server` |

`build:server` = `tsc -p server/tsconfig.json` → compile vers `server/dist/`.
`start:server` = `node server/dist/index.js` (version compilée, pas `tsx`).
Le serveur écoute `process.env.PORT` (fourni automatiquement par Render).

### Variables d'environnement (Render dashboard)

| Variable | Valeur |
|----------|--------|
| `LIVEKIT_URL` | `wss://<ton-projet>.livekit.cloud` |
| `LIVEKIT_API_KEY` | clé du projet LiveKit |
| `LIVEKIT_API_SECRET` | secret du projet LiveKit |
| `PORT` | fourni par Render — ne pas définir manuellement |
| `WEB_ORIGIN` | `https://ton-frontend.vercel.app` (à renseigner **après** le déploiement Vercel) |
| `PERFORMER_PASSWORD` | mot de passe protégeant les tokens performer (`canPublish`) — requis en production |

> `LIVEKIT_API_SECRET` reste côté Render uniquement. Le frontend ne le reçoit jamais.
>
> `PERFORMER_PASSWORD` protège la génération des tokens LiveKit avec `canPublish` :
> un performer doit le saisir pour démarrer un broadcast. Si la variable est absente,
> `/api/token` renvoie `503` pour les performers. **Les listeners restent publics**
> (aucun mot de passe requis).

## Frontend — Vercel

Importer le repo dans Vercel.

| Paramètre | Valeur |
|-----------|--------|
| Root Directory | `apps/web` |
| Framework Preset | Vite |
| Build Command | `npm run build` (défini dans `vercel.json`) |
| Output Directory | `dist` (défini dans `vercel.json`) |
| Install Command | `npm install` (auto) |

`apps/web/vercel.json` gère le build et le **SPA fallback** : les routes
`/performer` et `/listen` (et toute route non-fichier) renvoient vers
`index.html`. Les assets statiques (`/assets/*`) sont servis en priorité.

### Variable d'environnement (Vercel dashboard)

| Variable | Valeur |
|----------|--------|
| `VITE_API_BASE` | `https://ton-backend.onrender.com` (URL publique Render) |

Préfixe `VITE_` requis pour exposer la variable au bundle client. En dev elle
reste vide : Vite proxye `/api` vers `localhost:3001` (`vite.config.ts`).

## Ordre de déploiement

1. Déployer le **backend Render** → récupérer son URL publique
   (`https://ton-backend.onrender.com`).
2. Déployer le **frontend Vercel** avec `VITE_API_BASE` = URL Render.
3. Revenir sur Render → renseigner `WEB_ORIGIN` = URL Vercel (CORS).
4. Vérifier :
   - `curl https://ton-backend.onrender.com/api/health` → `{"ok":true,...}`
   - Ouvrir `https://ton-frontend.vercel.app/performer` → Check server config
     (Debug) : les trois `oui` + `URL factice : non`.

## Notes

- `getUserMedia` exige HTTPS en production : Vercel et Render servent en HTTPS.
- CORS : `localhost:5173` (dev) + `WEB_ORIGIN` (prod). Pas de wildcard.
- Le pipeline audio performer/listener et le backend token sont inchangés.