# Radio MIDI Message Bridge — Protocole v1

> Envoyer les métadonnées d’un morceau depuis **Ableton Live** vers la radio web, via un
> **clip MIDI synchronisé** et un patch **Max / Max for Live**. Le MIDI Bridge est une
> **nouvelle source de publication** parallèle au système existant. Il ne crée pas de
> nouveau listener, ne modifie pas l’endpoint `/api/broadcast-message` ni le schéma serveur.

## 1. Vision produit

Je lance mes morceaux dans Ableton Live. En parallèle du clip audio, je lance un **clip MIDI
« data »** synchronisé avec le morceau. Ce clip ne joue **pas de musique** : il transporte un
**paquet de métadonnées** (titre, artiste, note, ticker, réglages visuels…).

```
Ableton Live
  ├── clip audio du morceau
  └── clip MIDI data synchronisé
        ↓
Max / Max for Live
        ↓
Décode le MIDI en paquet JSON
        ↓
POST /api/broadcast-message   (endpoint existant, inchangé)
        ↓
Site radio public (/, /listen)
        ↓
Affichage split-flap existant (HotFX/internal, ticker, note pages)
```

Le paquet MIDI n’est qu’un **transport**. À la réception, Max reconstruit un objet `message`
compatible `BroadcastInput` et le POST au backend exactement comme le ferait le formulaire
`/performer`. Le site public ne voit aucune différence.

## 2. Contrats inchangés

Le MIDI Bridge **ne touche pas** : LiveKit audio, `/performer`, `/` et `/listen`, Audio Monitor,
split-flap / HotFX, ticker, note pages split-flap, l’endpoint `/api/broadcast-message`, ni le
schéma `BroadcastMessage`. Il **réutilise** l’endpoint existant.

Payload POST (identique au formulaire performer) :

```json
POST {backendUrl}/api/broadcast-message
{
  "performerPassword": "...",
  "message": { ...BroadcastInput compatible... }
}
```

Aucun nouvel endpoint en v1. Aucune modification du schéma serveur.

## 3. Format du paquet logique

```jsonc
{
  "protocol": "radio-midi-message",   // requis, exactement cette chaîne
  "version": 1,                         // requis, entier 1
  "eventId": "track-001-intro",         // requis, identifiant stable du message
  "createdAt": "2026-07-10T10:00:00.000Z", // optionnel, ISO 8601
  "message": {                          // requis, objet BroadcastInput compatible
    "type": "track",
    "mainTitle": "FM CLOUDS",
    "subtitle": "Live from Ableton",
    "artist": "Olivier",
    "album": "Blackhole Sessions",
    "note": "Message long affiché sur la radio.",
    "ticker": "Ableton → MIDI → Max → JSON → Radio",
    "url": "",
    "displayMode": "paged",
    "brandLabel": "RADIO BLACKHOLE",
    "visual": {
      "splitFlapEngine": "hotfx",
      "preset": "pirate-industrial",
      "transition": "flip-scramble",
      "noteMode": "paged",
      "pageDurationMs": 6000,
      "hotfxDurationMs": 100
    }
  },
  "checksum": "b3f0..."                // recommandé, détection de transmission incomplète
}
```

Règles :

- `protocol` doit être **exactement** `"radio-midi-message"`.
- `version` doit être **1**.
- `eventId` est **requis** : identifiant stable (ex. `track-001-intro`). Sert à l’anti-duplication.
- `message` est **requis** : objet compatible `BroadcastInput`. Le protocole le transporte de
  façon opaque (il ne valide pas son contenu ; c’est le backend qui valide `BroadcastMessage`).
- `checksum` est **recommandé** pour détecter une transmission incomplète (voir §5).

> Note schéma : l’exemple contient à la fois `displayMode` (champ top-level hérité) et
> `visual.noteMode`. Le split-flap utilise **`visual.noteMode`** (`paged`/`scroll`/`static`).
> `displayMode` est conservé pour compatibilité mais c’est `visual.noteMode` qui pilote le rendu.

## 4. Encodage — JSON → UTF-8 → Base64 → notes MIDI

Étapes (l’ordre est important) :

1. Construire le paquet JSON **sans** `checksum`.
2. Sérialiser en `JSON.stringify` (string).
3. Encoder en **UTF-8** (les accents français passent ici).
4. Encoder en **Base64** (standard `A-Z a-z 0-9 + / =`).
5. Calculer le **checksum** sur la chaîne Base64 (voir §5).
6. Ajouter `checksum` au paquet, puis **re-sérialiser** le paquet complet en JSON, UTF-8, Base64.
   > En v1, le checksum est calculé sur le Base64 du paquet **sans** checksum, puis inclus
   > dans le paquet final. Le décodeur recalcule sur le Base64 reçu (hors checksum) et compare.
7. Transformer **chaque caractère Base64** en une note MIDI dont le **pitch = code ASCII du
   caractère**.

Plage ASCII des caractères Base64 :

| Caractères | ASCII |
|---|---|
| `A`–`Z` | 65–90 |
| `a`–`z` | 97–122 |
| `0`–`9` | 48–57 |
| `+` | 43 |
| `/` | 47 |
| `=` (padding) | 61 |

Plage utile : **43 à 122**. Aucun conflit avec les notes de contrôle `1`, `2`, `3`.

## 5. Checksum (v1)

Pour v1, un checksum **simple** suffit à détecter une transmission incomplète. On évite les
grosses dépendances.

Choix retenu : **somme des charCodes modulo 65535**, calculée sur la chaîne **Base64** (hors
checksum), rendue en hexadécimal minuscule.

```
checksum = (sum(charCode(c) for c in base64String) % 65535).toString(16)
```

- Calculé sur le Base64 du paquet **sans** checksum.
- Inclu dans le paquet final (`checksum`).
- Le décodeur recalcule sur le Base64 reçu (paquet décodé moins son champ `checksum`) et compare.
  En cas de mismatch → erreur `checksum mismatch`, message **non posté**.

Alternative (non implémentée en v1) : CRC32 si déjà disponible sans grosse dépendance. La
somme modulo 65535 reste suffisante pour détecter des drops de notes MIDI sur un clip court.

## 6. Canal MIDI

On utilise le **canal 16** pour les données radio, afin de ne pas polluer les canaux
musicaux 1–15.

⚠️ Représentation du canal selon l’API :

- **Côté UI Max** (`notein`, messages humains) : canal **1–16** → on utilise **16**.
- **Côté code MIDI bas niveau** (status byte, certains parseurs) : canal **0–15** → le canal
  16 utilisateur = canal **15** raw.

> **Canal utilisateur = 16. Canal MIDI raw = 15 si nécessaire.** Documenter clairement dans le
> patch Max selon l’objet utilisé (`notein` expose 1–16 ; les bytes bruts `0x9F` = note-on canal
> 16).

## 7. Notes de contrôle

| Note (pitch) | Rôle | Effet à la réception |
|---|---|---|
| **1** | `START_MESSAGE` | Vider le buffer, entrer en mode `receiving` |
| **2** | `END_MESSAGE` | Décoder Base64 → UTF-8 → JSON, valider, poster |
| **3** | `CLEAR_BUFFER` / `CANCEL` | Vider le buffer, annuler `receiving` |

Payload : chaque caractère Base64 est envoyé comme une note dont le pitch = ASCII du caractère
(plage 43–122). Velocity : `100` pour les notes de données, ignorée à la réception (seul le
pitch compte ; les note-off et les note-on velocity 0 sont ignorés).

Aucun conflit : `1`, `2`, `3` ne sont pas des caractères Base64 valides.

## 8. Réception Max (décodeur)

Le décodeur (patch Max + `radio_midi_bridge.js`) doit :

- Écouter **uniquement le canal 16** (ignorer tout autre canal).
- Ignorer les **note-off**.
- Ignorer les **note-on velocity 0** (certains clients envoient note-off comme note-on vel 0).
- Au `START_MESSAGE` (note 1) : vider le buffer, passer en `receiving = true`.
- Au `CLEAR_BUFFER` (note 3) : vider le buffer, `receiving = false`.
- Pendant `receiving` : accepter **uniquement** les pitches Base64 valides (43–90, 97–122,
  47, 43, 61). Tout pitch hors plage → erreur (ou ignoré selon config, voir §limites).
- Au `END_MESSAGE` (note 2) : décoder Base64 → UTF-8 → `JSON.parse`, puis :
  1. valider `protocol === "radio-midi-message"`, `version === 1`, `eventId` non vide,
     `message` présent ;
  2. vérifier le `checksum` si présent (recalcul + comparaison) ;
  3. anti-duplication `eventId` (voir §9) ;
  4. POST `message` vers `/api/broadcast-message` avec le `performerPassword` (saisi dans Max).

En cas d’erreur (décode, checksum, validation, HTTP) : afficher le statut, **ne pas poster**.

## 9. Anti-duplication `eventId`

Quand le clip MIDI boucle (ou rejoue), le même paquet arrive plusieurs fois. On garde en
mémoire :

- `lastEventId`
- `lastSentAt` (timestamp ms)

Règle : si le **même `eventId`** revient dans les **2 secondes**, on **ne republie pas** et on
log `duplicate ignored`. Au-delà de 2 s, on republie (changement volontaire de scène, par ex.).

> L’anti-duplication vit **côté décodeur Max** (le backend ne sait pas qu’un message vient du
> MIDI). C’est une protection locale, pas une garantie absolue.

## 10. Limites v1

- **Adapté** aux titres, notes courtes/moyennes, tickers, métadonnées.
- **Pas adapté** aux longs romans : un clip MIDI doit transporter chaque caractère comme une
  note ; les très longs paquets sont fragiles et lents.
- **Longueur max recommandée v1 : 4096 caractères Base64** (≈ 3 KB de JSON utile). Au-delà,
  le générateur `/performer` **refuse** avec un message clair.
- Le checksum (somme mod 65535) détecte les transmissions **incomplètes** (notes manquantes)
  mais **n’est pas** une protection cryptographique.
- Pas de retransmission automatique : si le POST échoue, l’opérateur doit relancer le clip.
- Le MIDI ne transporte **pas** l’audio. L’audio reste géré par LiveKit (chaîne existante).

## 11. Exemple complet

Message logique (sans checksum) :

```jsonc
{
  "protocol": "radio-midi-message",
  "version": 1,
  "eventId": "track-001-intro",
  "createdAt": "2026-07-10T10:00:00.000Z",
  "message": {
    "type": "track",
    "mainTitle": "FM CLOUDS",
    "subtitle": "Live from Ableton",
    "artist": "Olivier",
    "album": "Blackhole Sessions",
    "note": "À l’échelle du globe, les pirates créèrent un réseau d’information.",
    "ticker": "Ableton → MIDI → Max → JSON → Radio",
    "url": "",
    "displayMode": "paged",
    "brandLabel": "RADIO BLACKHOLE",
    "visual": {
      "splitFlapEngine": "hotfx",
      "preset": "pirate-industrial",
      "transition": "flip-scramble",
      "noteMode": "paged",
      "pageDurationMs": 6000,
      "hotfxDurationMs": 100
    }
  }
}
```

Pipeline :

1. `JSON.stringify` (sans checksum) → string
2. UTF-8 → bytes
3. Base64 → ex. `eyJwcm90b2NvbCI6InJhZGlvLW1pZGktbWVzc2FnZSIsInZlcnNpb24iOjEsImV2ZW50SWQiOiJ0cmFjay0wMDEtaW50cm8iLCJjcmVhdGVkQXQiOiIyMDI2LTA3LTEwVDEwOjAwOjAwLjAwMFoiLCJtZXNzYWdlIjp7InR5cGUiOiJ0cmFjayIsIm1haW5UaXRsZSI6IkZNIENMT1BEUyIsImFydGlzdCI6Ik9saXZpZXIiLCJub3RlIjoiw4AgbCfDqGNoZWxsZSBkdSBnbG9iZSIsImxlcyBwaXJhdGVzIGNyw6lhdHJlbnQgdW4gcsOpc2VhdSBkJ2luZm9ybWF0aW9uLiJ9fQ==`
4. Checksum = `sum % 65535` en hex → ex. `b3f0`
5. Paquet final (avec checksum) → re-sérialisé → Base64
6. Notes MIDI : `[1, <pitch[0]>, <pitch[1]>, …, 2]` sur **canal 16**, velocity 100

À la réception, Max reconstitue le Base64, décode, valide, et POST `message` au backend.

## 12. Test manuel sans Ableton

On peut valider tout le pipeline **sans Ableton ni Max**, depuis le navigateur :

1. `/performer` → panneau **MIDI Message Bridge** → saisir un `eventId` → bouton
   **Générer fichier MIDI data** → **Télécharger .mid**. On obtient un `.mid` standard
   (type 0, canal 16, START + payload + END).
2. Ouvrir le `.mid` dans un éditeur MIDI (ou le ré-importer dans Ableton) : vérifier le canal
   16, la note 1 (START), les notes de payload (pitches 43–122), la note 2 (END).
3. **Roundtrip logiciel** (selfcheck web) : `encodePacketToMidiNotes → decodePacketFromMidiNotes`
   retrouve le paquet original, accents français inclus (`À l’échelle du globe, les pirates
   créèrent…`).
4. **Test Max sans Ableton** : charger le `.mid` dans un lecteur MIDI virtuel (ex. un
   `midiparse` alimenté par la lecture du fichier) ou injecter les notes via `seq`/`borax` dans
   le patch `radio-midi-message-bridge.maxpat` → le décodeur reconstruit le JSON et (avec un
   `performerPassword` saisi) POST au backend → le site public affiche le message.

Voir aussi `tools/max/radio-midi-message-bridge/README.md` pour le câblage Max détaillé.

## 13. Références d’implémentation

- Lib TypeScript (encode/decode, notes, checksum) : `apps/web/src/lib/radioMidiMessageProtocol.ts`
- Générateur `.mid` (UI `/performer`) : panneau **MIDI Message Bridge** dans
  `apps/web/src/pages/Performer.tsx` (writer MIDI minimal, aucune grosse dépendance).
- Outils Max / Max for Live : `tools/max/radio-midi-message-bridge/`
- Selfchecks : `apps/web/selfcheck.ts` (roundtrip accents, START/END, rejets).