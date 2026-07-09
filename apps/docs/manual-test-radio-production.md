# Test radio — checklist production

Checklist de validation manuelle après déploiement (Vercel + Render + LiveKit
Cloud). À parcourir dans l’ordre. Remplacer les URL `…` par les vôtres.

URLs :
- Frontend : `https://…vercel.app`
- Backend : `https://…onrender.com`

## Page publique

- [ ] `/` affiche la page radio split-flap : header `RADIO BLACKHOLE` + point
      de status, grand titre, ligne secondaire, note, ticker bas.
- [ ] `/listen` affiche la même page radio que `/`.
- [ ] Aucun lien visible vers `/performer` sur la page publique.
- [ ] Sans message publié : titre `RADIO BLACKHOLE` (centré), ligne secondaire
      vide (tuiles vides, plus de « LIVE WEB AUDIO STREAM »), note
      `EN ATTENTE DU MESSAGE PERFORMER.`, ticker
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

- [ ] `/performer` : champ « Nom de la radio (header public) » → publier un
      brandLabel (ex. `BLACKHOLE FM`) → la page publique `/` affiche ce nom dans
      le header (fallback `RADIO BLACKHOLE` si vide). ≠ mainTitle (titre/piste).
- [ ] `/performer` : « Paramètres avancés » → « Tailles du panneau » : régler
      Titre/Secondaire/Note/Ticker/Panneau (scales %), Titre lignes (1–3),
      Secondaire lignes (0 = caché, 1–2) → la preview reflète les changements live.
- [ ] Publier → la page publique applique les mêmes tailles. Secondaire à 0 →
      la zone disparaît. Titre 2/3 lignes → le titre se wrappe sur plusieurs
      lignes (grille continue, colonnes alignées).
- [ ] « Réinitialiser tailles » → retour aux défauts (100 %, 1 ligne, 1 ligne).
- [ ] `/performer` : section « Visualisation split-flap » → « Moteur split-flap »
      propose Internal / HotFX. Choisir HotFX → la preview bascule en demi-clapets.
- [ ] Publier avec moteur HotFX → la page publique `/` affiche HotFX après polling
      (≤ 5 s). `/listen` idem.
- [ ] `/?engine=internal` force le moteur internal (override debug) ;
      `/?engine=hotfx` force HotFX, indépendamment du message publié.
- [ ] Performer : « Paramètres avancés » → régler Duration HotFX, Alphabet, Gap,
      hauteur (auto/fixed, min/max), style industriel (flicker, edge-glow,
      contrast, density, noise, radius, border) → la preview reflète les changements.
- [ ] Publier → la page publique applique les mêmes réglages (couleurs, timings,
      hauteur auto, style).
- [ ] Hauteur auto : une note courte → zone note courte (pas de grand vide) ;
      une note longue → paginée selon `noteRowsMax`.
- [ ] `prefers-reduced-motion` (DevTools → Rendering) : HotFX snap (duration 1 ms,
      pas de mouvement prolongé), flicker figé, flip internal figé.

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