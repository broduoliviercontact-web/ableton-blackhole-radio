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
- [ ] Sans message publié : titre `RADIO BLACKHOLE`, secondaire
      `LIVE WEB AUDIO STREAM`, note `EN ATTENTE DU MESSAGE PERFORMER.`,
      ticker `RADIO ONLINE · LISTEN LIVE · WEBRTC STREAM`.

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
  le pulse du point LIVE pour vérifier le respect du réglage.