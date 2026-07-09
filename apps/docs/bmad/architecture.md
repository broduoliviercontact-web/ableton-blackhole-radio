# Architecture — Mac Audio Input Broadcaster

## 1. Vue d'ensemble

```
Source audio du Mac (micro intégré / carte son / BlackHole / Loopback / autre virtuel)
                        │  (device d'entrée choisi dans /performer)
                        ▼
                 getUserMedia (page /performer)
                        │  MediaStream audio brut
                        ▼
                 LiveKit Room (publisher)  ──WebRTC──►  LiveKit SFU
                                                            │
                                                            ▼
                                                    LiveKit Room (subscriber, page /listen)
                                                            │
                                                            ▼
                                                    <audio> playback
```

L'utilisateur choisit n'importe quelle entrée audio du Mac. Pour le cas Ableton,
la source est typiquement une entrée virtuelle (BlackHole/Loopback) vers laquelle
le DAW route sa sortie — voir le brief, section « Cas d'usage Ableton avec
BlackHole ou Loopback ». L'architecture ne privilécie aucune entrée ; la
sélection est explicite côté UI.

Le backend Node est hors du chemin audio. Il ne fait que :
- servir l'API (`/api/health`, `/api/token`, `/api/config-check`),
- signer les tokens LiveKit avec `LIVEKIT_API_SECRET`.

## 2. Stack

| Côté | Tech |
|------|------|
| Frontend | React 19 + Vite 8 + TypeScript |
| Transport WebRTC | LiveKit (`livekit-client`, `@livekit/components-react`) |
| Backend | Node + Express 5 + TypeScript (exécuté via `tsx`) |
| Token | `livekit-server-sdk` |
| Validation | `zod` (body entrée API + env) |

Déjà installées dans le `package.json` racine du monorepo :
`@livekit/components-react`, `livekit-client`, `livekit-server-sdk`,
`express`, `cors`, `dotenv`, `zod`, `tsx`, `typescript`, types associés.

## 3. Sécurité / contexte

- `getUserMedia` → contexte sécurisé obligatoire.
  - Dev : `http://localhost` (exception sécurisée).
  - Prod : HTTPS + reverse proxy (non couvert par le Lot 1).
- `LIVEKIT_API_SECRET` : lu uniquement côté serveur. Le frontend ne le
  connaît jamais ; il ne reçoit qu'un token signé éphémère.
- CORS : le backend autorise `localhost:5173` (Vite dev) en dev.

## 4. Flux token

1. Frontend `POST /api/token { role, identity }`.
2. Serveur valide (zod), lit `LIVEKIT_API_KEY/SECRET/URL`, crée `AccessToken`
   avec grants selon rôle, signe, renvoie `{ token, url }`.
3. Frontend `room.connect(url, token)`.

## 5. Arborescence cible

Racine du monorepo = `apps/` (répertoire courant). Conventions du brief :
`apps/web` = `web/` (existant) et `apps/server` = `server/` (à créer).

```
apps/                         # monorepo root
├── package.json              # deps partagées (déjà présent)
├── .env.example              # à créer
├── .gitignore
├── docs/bmad/                # ce dossier
├── web/                      # apps/web — Vite+React+TS (existant)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig*.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx           # route /performer | /listen (routage simple)
│       ├── pages/
│       │   ├── Performer.tsx
│       │   └── Listen.tsx
│       ├── components/
│       │   ├── AudioDeviceSelect.tsx
│       │   ├── AudioMeter.tsx
│       │   └── ...
│       ├── hooks/            # useAudioDevices, useLocalAudioCapture, useLiveKit*
│       ├── lib/
│       │   ├── api.ts        # fetch /api/token
│       │   └── audio.ts      # getUserMedia + AnalyserNode
│       └── styles.css
└── server/                   # apps/server — à créer
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts          # express bootstrap + cors
        ├── config.ts         # env + zod
        ├── livekit.ts        # AccessToken signing
        └── routes/
            ├── health.ts
            └── token.ts
```

Notes :
- Pas de monorepo tooling lourd (pas de turbo/nx) : 2 apps, scripts npm
  suffisent. `concurrently` optionnel si on veut lancer web+server ensemble.
- `web/` existe déjà avec sa config Vite ; on ajoute `src/pages`,
  `src/components`, `src/lib`, `src/hooks`.

## 6. Décisions

- **Routage frontend** : pas de react-router pour 2 routes. Routage trivial par
  `window.location.pathname` dans `App.tsx`. (ponytail: 2 routes, pas de lib.)
- **Sélection d'entrée** : `enumerateDevices` liste toutes les `audioinput` ;
  l'utilisateur choisit explicitement. Présélection automatique d'une entrée
  virtuelle (BlackHole > Loopback) si détectée, sinon la première. Aucune entrée
  n'est imposée.
- **Publishing** : publication explicite du `MediaStream` choisi via
  `room.localParticipant.publishTrack(audioTrack, { source: Microphone })`.
  On n'utilise pas `setMicrophoneEnabled(true)` — on publie le track existant
  du flux capturé, pour forcer le device exact.
- **Pas de traitement audio** : constraints `false` sur les 3 flag, et
  publication directe du flux brut.
- **Self-check** : chaque fonction audio/logique non-triviale laisse un check
  minimal (cf. DoD).