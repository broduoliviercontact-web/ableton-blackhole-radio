# Test radio — checklist production

Checklist de validation manuelle après déploiement (Vercel + Render + LiveKit
Cloud). À parcourir dans l’ordre. Remplacer les URL `…` par les vôtres.

URLs :
- Frontend : `https://…vercel.app`
- Backend : `https://…onrender.com`

## Page publique

- [ ] `/` affiche la page radio split-flap : header `RADIO BLACKHOLE` + point
      de status, grand titre, ligne secondaire, note, ticker bas. Moteur par
      défaut = HotFX (sauf `?engine=internal`).
- [ ] `/listen` affiche la même page radio que `/` (même composant RadioPage).
- [ ] Aucun lien visible vers `/performer` sur la page publique.
- [ ] Sans message publié : titre `RADIO BLACKHOLE` (centré), **zone secondaire
      masquée** (plus de ligne vide quand subtitle/artiste/album sont vides),
      note `EN ATTENTE DU MESSAGE PERFORMER.`, ticker
      `RADIO BLACKHOLE · PIRATE WEBRTC STREAM · LISTEN LIVE`.

## Performer (gate)

- [ ] `/performer` demande un mot de passe (PerformerGate) avant de charger la
      page performer.
- [ ] Mauvais mot de passe → refusé (message d’erreur, page performer non
      chargée).
- [ ] Bon mot de passe → page performer chargée.
- [ ] Recharger `/performer` redemande le mot de passe (mot de passe en mémoire
      de session uniquement, non persisté).

## Broadcast audio

- [ ] Performer : Autoriser l’audio → sélectionner la source → Start local
      capture → Start broadcast → statut `live`.
- [ ] Page publique : Listen live → flux audio reçu (`🎧` / status `LIVE`).
- [ ] Volume listener à 0 → muet ; 50 → demi-niveau ; 100 → niveau original
      (jamais de boost).
- [ ] Stop broadcast côté performer → l’écoute publique s’arrête / status
      repasse à `OFFLINE`.

## Messages radio

- [ ] Performer : publier un message radio (titre, sous-titre, artiste, album,
      note, ticker) sans démarrer l’audio → `POST` accepté.
- [ ] Page publique : le message apparaît après polling (≤ 5 s).
- [ ] Ticker bas affiche le texte publié et défile.
- [ ] Note longue (> une page) → se pagine toutes les 6 s ; note courte → une
      seule page (pas de changement inutile).
- [ ] Réinitialiser le message → retour au message par défaut côté public.
- [ ] Aucun mot de passe n’apparaît dans le message public, les logs ou
      `/api/config-check` (booléen `performerPasswordConfigured` uniquement).

## Moteur split-flap & éditeur visuel

- [ ] `/` sans query param affiche le moteur **HotFX par défaut** (message publié
      sans `splitFlapEngine`, ou pas de message → fallback HotFX). `/listen` rend
      exactement comme `/`. `/?engine=internal` force internal ; `/?engine=hotfx`
      force HotFX, indépendamment du message publié (override debug local).
- [ ] `/performer` : champ « Nom de la radio (header public) » → publier un
      brandLabel (ex. `BLACKHOLE FM`) → la page publique `/` affiche ce nom dans
      le header (fallback `RADIO BLACKHOLE` si vide). ≠ mainTitle (titre/piste).
- [ ] `/performer` — bloc « ③ Affichage public » → « Tailles du panneau » : régler
      Titre/Secondaire/Note/Ticker/Panneau (scales %), Titre lignes (1–3),
      Secondaire lignes (0 = caché, 1–2) → l’aperçu reflète les changements live.
- [ ] Publier → la page publique applique les mêmes tailles. Secondaire à 0 →
      la zone disparaît. Titre 2/3 lignes → le titre se wrappe sur plusieurs
      lignes (grille continue, colonnes alignées).
- [ ] « Réinitialiser tailles » → retour aux défauts (100 %, 1 ligne, 1 ligne).
- [ ] `/performer` — bloc « ③ Affichage public » → « Moteur split-flap » propose
      Internal / HotFX. Choisir HotFX → l’aperçu bascule en demi-clapets.
- [ ] Publier avec moteur HotFX → la page publique `/` affiche HotFX après polling
      (≤ 5 s). `/listen` idem.
- [ ] `/performer` — bloc « ③ Affichage public » → « Alignement des textes » :
      Header / Titre / Secondaire / Note → segmented controls Gauche/Centre/Droite.
      L’aperçu réagit instantanément.
- [ ] Alignement Titre Centre/Droite/Gauche → le grand titre se padde dans la
      grille (Centre = équilibré, Droite = padStart, Gauche = padEnd). Publier →
      la page publique `/` applique le même alignement. Header = CSS `text-align`.
- [ ] Alignement Note Gauche/Centre/Droite → la zone note se padpe pareil. En mode
      Déroulement avec une note plus courte que la zone, l’alignement s’applique
      au lieu de défiler (note longue → défilement normal conservé).
- [ ] **Grille HotFX alignée** : publier un titre court + un secondaire + une note
      avec moteur HotFX → les cases du titre, du secondaire et de la note
      partagent le même axe de départ et les mêmes colonnes (plus de ligne courte
      flottante décalée). Vérifier sur `/` et dans l’aperçu performer.
- [ ] **boardColumns** : `/performer` — bloc « ③ Affichage public » → « Tailles du
      panneau » → « Nombre de cases par ligne (12–64) ». Tester 24, 32 (défaut),
      48 → l’aperçu réagit instantanément (plus de cases = texte plus long
      possible, cases plus serrées). Publier → la page publique applique la même
      largeur. Valeurs < 12 ou > 64 clampées côté serveur. Anciens messages sans
      `boardColumns` → 32 (rétro-compat). Le panneau ne déborde pas sur mobile.
- [ ] **Lignes vides masquées** : titre court (1 ligne) avec `titleRows=3` → une
      seule ligne visible (pas de 2ᵉ/3ᵉ ligne vide). Note courte → pas de grand
      bloc de cases vides. Secondary vide (pas de subtitle/artiste/album) → zone
      secondaire absente, même si `secondaryRows=1`.
- [ ] HotFX + accents français toujours OK : publier une note avec « café àù ç » →
      les lettres accentuées restent visibles (alphabet par défaut les contient).
- [ ] Performer : bloc « ⑤ Détails avancés » → régler Duration HotFX, Alphabet, Gap,
      hauteur (auto/fixed, min/max), style industriel (flicker, edge-glow,
      contrast, density, noise, radius, border) → l’aperçu reflète les changements.
- [ ] Publier → la page publique applique les mêmes réglages (couleurs, timings,
      hauteur auto, style).
- [ ] Hauteur auto : une note courte → zone note courte (pas de grand vide) ;
      une note longue → paginée selon `noteRowsMax`.
- [ ] `prefers-reduced-motion` (DevTools → Rendering) : HotFX snap (duration 1 ms,
      pas de mouvement prolongé), flicker figé, flip internal figé.

## Bandeau roulant & déroulement de la note

- [ ] `/performer` : section « Bandeau roulant » → modifier le texte du bandeau
      (placeholder `RADIO BLACKHOLE · LIVE FROM PANTIN · NEXT SESSION SOON`) →
      la preview reflète le ticker immédiatement.
- [ ] Changer la vitesse du bandeau (range 5 000–120 000 ms) → le défilement
      accélère / ralentit dans la preview et sur la page publique après publication.
- [ ] Changer le sens (Gauche / Droite) → le bandeau défile dans l'autre sens.
- [ ] Changer le séparateur (max 12, ex. ` | `) → inséré entre les répétitions.
- [ ] Décocher « Activer le bandeau » → le bandeau disparaît (preview + public).
- [ ] Mode de note = Déroulement → les contrôles « Déroulement de la note »
      apparaissent (vitesse, pas, boucle). Modifier la note longue → elle défile
      dans les cases split-flap (cases fixes, contenu qui se décale).
- [ ] Tester le mode Déroulement avec le moteur Internal, puis avec HotFX →
      défilement réel dans les tuiles (≠ du mode Paginé).
- [ ] Pas de boucle + note courte → la note s'arrête en fin (queue fixe) ;
      boucle + note longue → défilement continu (reboucle).
- [ ] Publier → la page publique `/` et `/listen` appliquent le même défilement.
- [ ] Mode Paginé et Statique → comportement inchangé (pas de défilement).

## Audio Monitor (page listener)

Visualisations audio temps réel côté listener (locales au navigateur — elles
n'affectent pas le flux LiveKit ni l'écoute, et ne remplacent pas un vrai meter
LUFS broadcast). Panneau repliable sous le split-flap, rAF stoppé tant que fermé.

- [ ] `/` sans stream : panneau « AUDIO MONITOR » fermé par défaut → « Afficher ▸ ».
      Statut « EN ATTENTE AUDIO » (point gris).
- [ ] Performer diffuse → listener « Listen live » → statut passe à « ANALYZING »
      (point jaune) dès qu'une remote audio track est attachée.
- [ ] Onglet **VU** : deux barres L/R bougent (RMS), montée rapide / descente lente,
      peak hold court. -60 → 0 dB.
- [ ] Onglet **dB** : peak L/R, RMS L/R, master approx + label
      (SILENCE / NORMAL / FORT / PROCHE CLIP / CLIP).
- [ ] Onglet **Spectrum** : spectre log 20 Hz → 20 kHz (audioMotion-analyzer),
      gradient radio-amber, repères 20/50/100/200/500/1k/2k/5k/10k/20k en bas.
      Fond sombre transparent.
- [ ] Onglet **Spectrogram** : waterfall (canvas), axe Y **logarithmique** (basses
      prennent plus de place, aigus compressés — remapping vrai des bins FFT,
      pas un étirement), repères fréquence log à gauche. Se clear au reset / reconnect.
- [ ] Onglet **Stereo** : vectorscope (x = L−R, y = L+R), label MONO / STEREO /
      PHASE RISK + corrélation −1..1.
- [ ] Onglet **Spectral** : 4 bandes (Bass / Lo-mid / Hi-mid / Air), centroid Hz,
      balance dominante, RMS dB.
- [ ] PAD -30 dB activé : l'écoute baisse, les visualisations continuent (elles
      tapent le flux brut, pas le <audio>).
- [ ] Mute : les visualisations continuent si le flux arrive encore (mute =
      volume <audio> à 0, pas l'analyse).
- [ ] « Stop » listener : statut repasse à « EN ATTENTE AUDIO », rAF/canvas nettoyés.
- [ ] « Reconnect » : l'analyse relance (nouveau graphe, même panneau).
- [ ] Changer d'onglet : seul l'onglet visible anime (rAF des autres stoppé).
- [ ] `prefers-reduced-motion` (DevTools → Rendering) : FPS réduit (8 fps),
      animations ralenties, pas de waterfall rapide.
- [ ] Onglet du navigateur en arrière-plan : rAF en pause (pas de fuite CPU).
- [ ] Recharger `/` : aucun AudioContext orphelin (nettoyage unmount).

## Débit audio reçu (listener)

Indicateur compact dans la barre de contrôles : `RX 78 kbps · jitter 12 ms ·
loss 0.0 %` (trafic réseau WebRTC entrant, ≠ niveau sonore).

- [ ] Sans flux / pas connecté → `EN ATTENTE AUDIO`.
- [ ] Performer diffuse → listener « Listen live » → l’indicateur passe à
      `RX —` puis affiche `RX <n> kbps · jitter <n> ms · loss <n.n> %` après ~1,5 s.
- [ ] Les valeurs bougent (kbps ~ débit audio, jitter quelques ms, loss ~0 % sur
      liaison saine). Tooltip au survol précise « trafic réseau entrant ».
- [ ] « Stop » listener → l’indicateur repasse à `EN ATTENTE AUDIO` (reset).
- [ ] Reconnect → les stats reviennent (nouveau receiver, même indicateur).
- [ ] PAD -30 dB activé ou mute → les stats continuent (le flux réseau arrive
      toujours ; mute = volume `<audio>` à 0, pas le transport).
- [ ] Navigateur sans stats receiver exposées → fallback propre `RX —` (pas de
      crash).

## Backend

- [ ] `GET /api/health` → `{"ok":true,...}`
- [ ] `GET /api/config-check` → `livekitConfigured: true`,
      `performerPasswordConfigured: true`.
- [ ] `GET /api/broadcast-message` → message courant (public, sans mot de
      passe).

## Notes

- Le message radio est stocké **en mémoire** côté serveur : il est perdu au
  redémarrage de Render. Vérifier le polling repart proprement après redémarrage.
- `prefers-reduced-motion` : couper le flip des tuiles, le scroll du ticker et
  le pulse du point LIVE pour vérifier le respect du réglage. HotFX passe en
  snap (duration 1 ms) — le texte final reste intact.