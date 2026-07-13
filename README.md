# Mac Audio Input Broadcaster

Application web React/Node TypeScript pour diffuser en direct une entrée audio
Mac vers des auditeurs web avec LiveKit/WebRTC. Pensé pour les musiciens qui
veulent envoyer la sortie de leur DAW (Ableton, et autres) vers un public
distinct via un simple lien.

React · Vite · TypeScript · Node · Express · LiveKit · WebRTC · audioMotion-analyzer · Vercel · Render

## Organisation du dépôt

Le produit Radio Blackhole vit dans `apps/` :

- `apps/web/` — frontend Vite/React déployé sur Vercel.
- `apps/server/` — backend Express/LiveKit déployé sur Render.
- `apps/docs/` — notes de déploiement, tests manuels et documentation technique.

Les outils Max for Live liés au pont MIDI sont dans `tools/max/radio-midi-message-bridge/`.

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
- **Audio Monitor (listener)** : panneau repliable sur `/` avec 6 visualisations
  temps réel du flux LiveKit — VU L/R, Peak/dB, Spectrum (audioMotion-analyzer),
  Spectrogram waterfall, Stereo vectorscope, Spectral info. Locales au navigateur,
  n'affectent pas l'écoute ni le stream (≠ meter LUFS broadcast).

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
npm run selfcheck:server   # grants token + validations serveur (env factice si .env absent)
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

### MIDI Message Bridge (Ableton → Max → Radio)

Une **seconde source de publication**, parallèle au formulaire `/performer` : un clip
MIDI « data » synchronisé avec un morceau Ableton transporte les métadonnées (titre,
artiste, note, ticker, réglages visuels) via un patch **Max / Max for Live**, qui décode
et POST au même endpoint `/api/broadcast-message`. La radio publique ne voit **aucune
différence** — aucun nouvel endpoint, aucun changement de schéma, aucun nouveau listener.

```
Ableton (clip MIDI data, canal 16) → Max (décode) → POST /api/broadcast-message → page radio
```

**Usage** :

1. `/performer` → panneau **MIDI Message Bridge** → `eventId` → **Générer fichier MIDI data**
   → **Télécharger `.mid`** (type 0, canal 16, START + payload Base64 + END).
2. Charger le `.mid` dans Ableton sur une piste MIDI (canal 16) synchronisée avec le
   morceau, routée vers le patch Max.
3. Le patch Max (`tools/max/radio-midi-message-bridge/`) décode le MIDI, vérifie le
   checksum, applique l'anti-duplication `eventId` (2 s), et POST le `message` au backend
   (avec le `performerPassword` saisi dans Max).

**Modes** : MIDI Decoder (clip Ableton) ou Send Now (publication directe depuis Max, sans
clip). Protocole v1 : JSON → UTF-8 → Base64 → notes MIDI (pitch = ASCII), checksum somme
mod 65535, limite recommandée 4096 caractères Base64 (≈ 3 KB JSON). Adapté aux titres/notes/
tickers/métadonnées — **pas** aux longs textes. Le MIDI ne transporte pas l'audio (LiveKit
gère l'audio, chaîne existante).

> Docs : `apps/docs/radio-midi-message-bridge.md` (protocole) ·
> `tools/max/radio-midi-message-bridge/README.md` (câblage Max, sécurité, test sans Ableton).
> Lib : `apps/web/src/lib/radioMidiMessageProtocol.ts`. **Le `performerPassword` ne doit
> jamais être committé** — le patch Max le contenant reste local.

## Moteur split-flap & éditeur visuel

Deux moteurs d'affichage split-flap, choisis par le performer (persistés dans
`message.visual.splitFlapEngine`) :

- **HotFX** (défaut) — web component `<hotfx-split-flap>` (demi-clapets `clip-path`),
  plus mécanique. **Vendored localement** (`apps/web/src/components/hotfx/`), licence
  MIT — pas de CDN, pas de dépendance npm. Source :
  [github.com/hot-page/fx](https://github.com/hot-page/fx).
- **Internal** — tuiles React + CSS 3D (flip mécanique, scramble, etc.).

Priorité du moteur sur la page publique : `?engine=internal|hotfx` (override debug
local) → `message.visual.splitFlapEngine` → `hotfx` (fallback). Anciens messages
sans `splitFlapEngine` tombent donc sur HotFX.

L'éditeur performer (`/performer`) expose un `visual` persistant : preset,
transition, mode de note, pagination, couleurs, moteur, réglages HotFX natifs
(duration/alphabet/grid-gap/hauteur auto-fix/min-max) et un style industriel
(edge-glow, flicker, contraste, densité, noise, radius tuile, bordure). La
preview reproduit fidèlement la page publique. Override debug local :
`/?engine=hotfx` ou `/?engine=internal`.

**Branding & tailles du panneau** : `brandLabel` (nom de la radio affiché dans
le header public, ≠ `mainTitle` qui est le titre/piste ; fallback
`RADIO BLACKHOLE`) et `visual.layout` (scales % par zone — titre/secondaire/
note/ticker 50–200, panneau 70–130 ; lignes titre 1–3, secondaire 0–2 ;
`boardColumns` 12–64, défaut 32 = nombre de cases par ligne). Les scales
pilotent la taille des tuiles via des variables CSS (grille continue,
colonnes alignées). `boardColumns` fixe la largeur de grille commune à toutes
les zones (title/secondary/note ont exactement le même nombre de colonnes).
Réinitialisable d'un clic. Anciens messages sans `brandLabel`/`layout` restent
valides (défauts 100 %, 1 ligne, 32 colonnes).

**Grille HotFX alignée & lignes vides masquées** : toutes les zones HotFX
partagent une largeur de case uniforme (`::part(char)` width = 30 px × density ×
board-scale, indépendante du `<zone>-scale`) → même axe de départ, mêmes
colonnes, plus de ligne courte flottante (vrai panneau de gare). Le
`<zone>-scale` grossit le glyph et la hauteur, pas la largeur de case. Les lignes
entièrement vides en fin de bloc sont retirées (`trimEmptyDisplayLines`) : un
titre court n'affiche pas de 2ᵉ ligne vide, une note courte ne produit pas un
grand bloc vide. La zone secondaire est masquée quand subtitle/artiste/album sont
tous vides (≠ juste `secondaryRows=0`).

**Alignement des textes** : `visual.layout` accepte quatre alignements
(`brandAlign`/`titleAlign`/`secondaryAlign`/`noteAlign`, chacun `left|center|right`).
`brandAlign` agit sur le header via CSS `text-align` ; les trois autres paddent les
caractères dans la grille split-flap (centre = équilibré, droite = padStart,
gauche = padEnd). Défauts : header gauche, titre/secondaire/note centrés. En mode
`scroll` avec une note plus courte que la zone, l'alignement s'applique au lieu de
défiler (note longue → défilement conservé). L'éditeur performer expose des
segmented controls Gauche/Centre/Droite (bloc « ③ Affichage public »).

**Bandeau roulant & déroulement** : `visual.ticker*` (texte via `message.ticker`,
`tickerSpeedMs` 5 000–120 000, `tickerDirection` left/right, `tickerSeparator`
max 12 fallback ` · `, `tickerEnabled` booléen) contrôlent le bandeau bas —
`tickerEnabled=false` le masque ; défilement CSS seamless (unit × 2, -50 %). Le
mode de note `scroll` fait défiler la note **dans les tuiles** split-flap elles-
mêmes (vrai bandeau de gare) via `visual.noteScroll*` (`noteScrollSpeedMs`
100–5 000, `noteScrollStep` 1–8, `noteScrollLoop` booléen). Moteurs Internal et
HotFX partagent la même fenêtre de défilement (`useScrollingTextWindow`).
`paged`/`static` inchangés.

> Limites HotFX : uppercase forcé, animation séquentielle (pas un scramble
> aléatoire), `duration` = ms par clapet (≠ durée totale). Les accents français
> courants (ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ) sont inclus dans l'alphabet par défaut — un
> caractère absent devient espace, d'où l'inclusion. `prefers-reduced-motion` →
> `duration` 1 ms (snap). Mode `scroll` +
> transition `flip` : animation mécanique chargée (toutes les tuiles re-flipent
> à chaque tick) ; pour un défilement fluide, préférer transition `instant` ou
> un `noteScrollSpeedMs` plus lent.

## Audio Monitor (listener)

Le panneau « AUDIO MONITOR » (`/`, repliable sous le split-flap) expose 6
visualisations temps réel du flux LiveKit entendu par le listener :

- **VU L/R** (maison) — RMS par canal, ballistique VU (montée rapide / descente
  lente), peak hold court, -60 → 0 dB.
- **Peak / dB** (maison) — peak L/R, RMS L/R, master approx + label d'ambiance
  (SILENCE / NORMAL / FORT / PROCHE CLIP / CLIP).
- **Spectrum** — `audiomotion-analyzer` (échelle log 20 Hz → 20 kHz, gradient
  radio-amber, repères 20/50/100/200/500/1k/2k/5k/10k/20k en overlay,
  `connectSpeakers: false`).
- **Spectrogram** (maison, canvas) — waterfall, axe Y **logarithmique** (vrai
  remapping des bins FFT par ligne, agrégation max → basses plus larges, aigus
  compressés), repères fréquence log à gauche, FPS ≤ 24.
- **Stereo / vectorscope** (maison) — x = L−R, y = L+R, corrélation L/R
  (MONO / STEREO / PHASE RISK).
- **Spectral** (maison) — bandes Bass / Lo-mid / Hi-mid / Air, centroid spectral,
  balance dominante, RMS.

**Connexion au flux** : `useLiveKitListen` tappe chaque `RemoteAudioTrack` via
`track.mediaStreamTrack` et l'envoie au bus d'analyse (`apps/web/src/audio/listenerAnalysis.ts`).
Ce bus crée un `AudioContext` partagé (paresseux, après le geste « Listen live »),
un `AnalyserNode` stéréo + `ChannelSplitter` + analyseurs L/R. Les sources
d'analyse ne sont **jamais** connectées à la `destination` → aucun doublage
audible, l'écoute (volume / mute / PAD -30 dB) reste gérée par les `<audio>`
existants. `stop()` ferme le graphe (unmount / arrêt).

**Perf** : un seul rAF par onglet visible (throttlé `maxFps`), stoppé quand le
panneau est fermé ou l'onglet caché (rAF ne tourne pas en arrière-plan).
`prefers-reduced-motion` → FPS réduit à 8. Nettoyage strict à l'unmount (pas de
fuite AudioContext / rAF).

**Panneau redimensionnable** : le panneau ouvert se redimensionne à la souris /
au trackpad / au touch via une poignée `ns-resize` en bas (pointer capture, clamp
220–760 px, défaut 360). Les 6 visualisations suivent la nouvelle hauteur sans
flou — les canvas maison se recalculent via `ResizeObserver` (`useCanvasResolution`),
et le spectrum `audioMotion-analyzer` réagit via son propre `ResizeObserver` sur le
conteneur (config log 20 Hz–20 kHz et repères fréquence inchangés). Hauteur
persistée localement dans `radio.audioMonitor.height` (aucune synchro backend).
Boutons **Compact 260 / Normal 360 / Large 560** + clavier (↑ +20 px, ↓ −20 px,
Home = min, End = max) sur la poignée (`apps/web/src/hooks/useResizablePanel.ts`).
Masquer/Afficher conserve la hauteur ; panneau fermé → hauteur auto (header seul).

> Limites : monitoring local navigateur (dBFS, pas LUFS broadcast). Sans remote
> track → « EN ATTENTE AUDIO ». **Meyda** (spectral features propres) et
> **Butterchurn** (visualizer WebGL MilkDrop) non intégrés — phase 2 si besoin.

**Indicateur débit audio (listener)** : la barre de contrôles affiche en compact
`RX 78 kbps · jitter 12 ms · loss 0.0 %` — le trafic réseau WebRTC **entrant**
reçu par ce navigateur (≠ niveau sonore). Récupéré via
`RemoteTrack.getRTCStatsReport()` (rapport `inbound-rtp` audio) pollé toutes
les 1,5 s (`apps/web/src/audio/audioReceiverStats.ts`). Bitrate = delta
`bytesReceived` / delta temps ; jitter en ms ; loss = `packetsLost /
(packetsReceived + packetsLost)`. États : `EN ATTENTE AUDIO` (pas connecté) ·
`RX —` (connecté mais stats indisponibles) · `RX 78 kbps …`. Le PAD -30 dB et le
mute n'affectent pas ces stats (le flux réseau arrive toujours). Si le navigateur
n'expose pas les stats receiver, fallback propre → `RX —`.

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

## Notes

- Frontend CSS nettoyé des restes du starter Vite (`.hero`, `#next-steps`, `#center`,
  `.counter`, largeur magique `#root` 1126px) ; couleur d'accent alignée sur l'ambre
  Radio Blackhole (`--accent: #f5d76b`, + `--accent-deep`/`--accent-bright`). Fin de la
  fuite du violet SaaS (`#aa3bff`) dans le bouton *Publier* et les *segmented controls*.
