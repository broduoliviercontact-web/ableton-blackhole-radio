# Radio Visualization Suite

La page publique partage un seul message radio et peut maintenant l'afficher
avec dix-sept moteurs. Le Split-Flap reste le rendu signature et conserve ses
moteurs Internal et HotFX. Les seize autres moteurs sont rendus par
`RadioDataVisual`.

## Architecture

`BroadcastVisual.visualization` est le contrat persisté, validé à la fois par
le client et le serveur. Les messages plus anciens sans champ `visualization`
restent en Split-Flap.

Les moteurs alternatifs reçoivent un `RadioVisualData` normalisé : marque,
titre, secondaire, note, ticker, type et date. Ils ne lisent pas directement le
message réseau, ce qui garde les fallbacks cohérents entre la page publique et
l'aperçu performer.

`useRadioMetrics` centralise la lecture Web Audio. Il maintient des buffers
réutilisés pour waveform, spectre et canaux gauche/droit, puis expose RMS,
peak, bandes, centroid, width et corrélation. Sans écoute LiveKit, l'aperçu
utilise un signal semi-déterministe. Les boucles sont limitées à 24 fps, 8 fps
avec `prefers-reduced-motion`, et 4 fps en arrière-plan. Les canvas plafonnent
le DPR à 2 et sont redimensionnés avec `ResizeObserver`.

## Moteurs

| Famille | Visualisations |
| --- | --- |
| Signature | Split-Flap |
| Information | CRT Terminal, ASCII Wave, Teletext, Dot Matrix, Packet Stream |
| Audio | Signal Scope, Spectrum Waterfall, Stereo Orbit, Analog Persistence |
| Génératif | Event Horizon, Radar Transmission, Constellation Radio, Pixel Mosaic |
| Éditorial | Kinetic Type, Tape Machine |
| WebGL | Shader Radio: Spectral Bloom, Liquid Scope, Feedback Tunnel, Interference Field, Phosphor Plasma, Signal Aurora |

## Réglages communs

Le module **Affichage** du performer propose une grille de sélection et les
réglages `visualDensity`, `visualSpeed`, `visualIntensity`, `visualGlow` et
`visualPalette`. Tous sont optionnels, bornés par le serveur, puis résolus côté
client. Les réglages Split-Flap existants restent disponibles uniquement quand
ce moteur est choisi.

## Shader Radio

`shader-radio` est un canvas WebGL2 utilisé comme fond réactif. Le message radio
reste une surcouche HTML afin de préserver lisibilité, accessibilité et
traduction. Les presets `shaderPreset` sont `spectral-bloom`, `liquid-scope`,
`feedback-tunnel`, `interference-field`, `phosphor-plasma` et `signal-aurora`.

`shaderQuality` propose `low`, `balanced` et `high`. Le moteur plafonne le DPR
et la cadence selon cette qualité, réduit la cadence en arrière-plan ou avec
`prefers-reduced-motion`, puis bascule vers un fond CSS si WebGL2 est absent ou
si le contexte est perdu.

## Ajouter un moteur

1. Ajouter l'identifiant à `Visualization` côté client et serveur.
2. Ajouter la validation Zod dans `apps/server/src/broadcastMessage.ts`.
3. Créer un composant dans `components/radio-visuals/engines/` utilisant
   `RadioVisualProps` et, pour le canvas, `VisualCanvas`.
4. Enregistrer explicitement le moteur dans le `switch` de `RadioDataVisual`.
5. Ajouter sa carte d'éditeur, une scène système et un test de contrat.

Le routeur est volontairement exhaustif: une nouvelle visualisation ne peut pas
tomber silencieusement sur un autre moteur.
