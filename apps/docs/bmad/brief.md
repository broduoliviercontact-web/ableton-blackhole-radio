# Brief — Mac Audio Input Broadcaster (LiveKit)

Statut : Draft (aligné sur le changement de direction 2026-07-09)
Date : 2026-07-09

## Problème

Un musicien diffuse en direct depuis une source audio de son Mac vers des
auditeurs sur le web. Aujourd'hui cela passe par des outils tiers (OBS, Twitch,
etc.) qui ajoutent de l'encodage, du retard et de la complexité. On veut une
chaîne courte et maîtrisée : entrée audio du Mac → navigateur du performer →
WebRTC (LiveKit) → navigateurs des auditeurs.

L'app ne se limite pas à Ableton : elle diffuse **n'importe quelle entrée
audio** du Mac (micro intégré, carte son USB, ou entrée virtuelle comme
BlackHole/Loopback). Le cas Ableton reste un cas d'usage recommandé (section
dédiée ci-dessous).

## Objectif

Un site web à deux pages :

- `/performer` : liste les entrées audio disponibles, l'utilisateur choisit
  celle qu'il veut, capture le flux et le publie dans une room LiveKit.
- `/listen` : rejoint la même room, lit l'audio reçu.

Un backend Node minimal qui ne transporte **pas** l'audio — il génère
seulement les tokens LiveKit et sert l'API.

## Cas d'usage Ableton avec BlackHole ou Loopback

Pour envoyer la sortie d'un DAW (Ableton Live) vers le navigateur, le
performer installe une entrée audio virtuelle (BlackHole 2ch, Loopback…) et la
choisit comme entrée dans `/performer`, après avoir routé la sortie du DAW vers
elle. C'est une **recommandation**, pas une obligation produit : l'app
fonctionne aussi avec un micro intégré ou une carte son.

## Hors-scope (YAGNI)

- Authentification, comptes, gestion de salles multiples, recordings.
- Chat, métadonnées de piste, contrôle de volume côté auditeur (le navigateur
  le fait déjà).
- Encodage/re-stream vers Twitch/YouTube.
- Traitement audio côté web (le son sort brut de la source).
- Support Windows/Linux : l'app se concentre sur macOS ; les entrées virtuelles
  recommandées (BlackHole) sont macOS-only, mais toute entrée audio standard
  fonctionne.

## Personas

- **Performeur** : sur macOS, choisit une entrée audio à diffuser (micro intégré,
  carte son, ou entrée virtuelle type BlackHole/Loopback pour un DAW). Lance la
  diffusion, a besoin d'un vumètre et d'un retour de statut clair.
- **Auditeur** : ouvre un lien `/listen` dans un navigateur. Ne configure rien.

## Contraintes clés

- `getUserMedia` exige un contexte sécurisé : `localhost` en dev, HTTPS en prod.
- L'utilisateur sélectionne explicitement une entrée audio — pas de "default
  device" implicite. Une entrée virtuelle (BlackHole/Loopback) est présélectionnée
  automatiquement si détectée, sinon la première entrée disponible.
- Pas de traitement voix : `echoCancellation/noiseSuppression/autoGainControl`
  tous à `false`.
- `LIVEKIT_API_SECRET` jamais côté frontend.
- Messages d'erreur explicites (cf. DoD) pour : aucun device, permission refusée,
  échec connexion LiveKit. Une note douce (non bloquante) signale si la source
  ressemble à un micro intégré et suggère une entrée virtuelle pour Ableton.

## Succès

1. Performeur démarre une diffusion depuis `/performer` avec l'entrée de son
   choix, vumètre bouge.
2. Auditeur ouvre `/listen`, entend le son de la source avec < 1s de latence.
3. Arrêt propre, reconnexion propre.