# Radio MIDI Message Bridge — Outils Max / Max for Live

Décode les **clips MIDI « data »** générés par le panneau **MIDI Message Bridge** de
`/performer` (ou par un clip Ableton synchronisé) et les **POST** à l’endpoint existant
`/api/broadcast-message`. La radio publique (`/`, `/listen`) affiche alors le message via
le split-flap existant — **aucune différence** côté site. Le device ne produit **aucun son**
(pas de `midiout` : les notes data sont consommées par le décodeur, non retransmises).

> Protocole complet : [`apps/docs/radio-midi-message-bridge.md`](../../apps/docs/radio-midi-message-bridge.md).
> Lib TS de référence : `apps/web/src/lib/radioMidiMessageProtocol.ts`.

## 1. Fichiers

| Fichier | Rôle | Objet Max |
|---|---|---|
| `radio-midi-message-bridge.maxpat` | **Patch Max prêt à l’emploi** : entrées MIDI (midiin + notein), décodeur, POST, logs, config, boutons `clear`/`test`. Ouvrable dans Max 8 ; sauvable comme Max for Live MIDI Effect (§3). | patcher |
| `radio_midi_bridge.js` | **Décodeur MIDI** temps-réel : notes → buffer → Base64 → UTF-8 → JSON → validation → checksum → anti-dup `eventId` → outlet 0 (`message` JSON). Handlers : `list <pitch> <vel> <chan>`, `msg_int <pitch>`, `clear`, `test`. | `js` (pas Node) |
| `radio_midi_poster.js` | **Couche HTTP** : reçoit le `message` JSON, POST `{performerPassword, message}` à `/api/broadcast-message`. Handlers : `config <url> <pw>`, `post <json>`, `sendnow <json>`. Sort un outlet `status config CONFIG OK / NOT CONFIGURED`. | `node.script` (Node for Max) |

> **Le `.maxpat` est livré et câble déjà tout ça.** La recette de câblage §4 reste utile pour
> comprendre ou recâbler. **Pas de `.amxd`** livré : c’est un format binaire M4L non générable
> proprement hors Max — voir §3 pour sauver le patch comme Max for Live MIDI Effect depuis
> Ableton/Max. Le `performerPassword` n’est **jamais** dans le `.maxpat` committé (à saisir
> via le message `config`).

## 2. Pré-requis

- **Max 8** (ou Max for Live) avec **Node for Max** activé (Preferences → Max → Node for Max).
- Le **backend** en route (local : `npm run build:server && npm run dev` depuis `apps/`,
  PORT 3001 ; ou l’URL de prod).
- Un **performerPassword** configuré côté serveur (`PERFORMER_PASSWORD` / `PERFORMER_PASSWORDS`).
- Le panneau **MIDI Message Bridge** de `/performer` pour générer un `.mid` de test, ou un
  clip MIDI « data » dans Ableton (canal 16, notes START/payload/END).

## 3. Ouvrir le patch et l’utiliser dans Ableton (Max for Live)

### 3.1 Ouvrir dans Max (standalone)

Double-cliquez `radio-midi-message-bridge.maxpat` (ou File → Open dans Max). Les scripts
`radio_midi_bridge.js` et `radio_midi_poster.js` doivent être dans le **même dossier** (ils
y sont). Vérifiez qu’aucun objet n’est **rouge** (objet manquant) — si `node.script` est
rouge, activez Node for Max (Preferences → Max → Node for Max).

### 3.2 Utiliser comme Max for Live MIDI Effect dans Ableton

Le `.maxpat` ne contient **pas** de `midiout` : les notes data entrantes sont consommées par
le décodeur et **non retransmises** → aucun son, exactement ce qu’on veut.

1. **Ouvrir Ableton Live.**
2. **Créer une piste MIDI** (Create → Insert MIDI Track).
3. **Importer le `.mid`** généré depuis `/performer` (panneau **MIDI Message Bridge** →
   Télécharger `.mid`) : glissez le fichier sur la piste, ou Drop dans un clip.
4. **Charger le patch** : ouvrez `radio-midi-message-bridge.maxpat` dans Max, puis
   **File → Save as Max for Live Device…** → choisissez le type **MIDI Effect** →
   enregistrez le `.amxd` (en local, hors git — voir §7 sécurité). Glissez le `.amxd` sur
   la piste MIDI (avant tout instrument). *Alternative* : dans Ableton, clic droit sur la
   piste → Max for Live → glisser le `.maxpat` converti.
5. **Configurer backend URL** : dans le patch, éditez la message box `config <url> <pw>` —
   défaut `http://localhost:3001`, prod `https://ableton-blackhole-radio.onrender.com`.
6. **Entrer performer password** : remplacez `YOUR_PASSWORD_HERE` par votre
   `PERFORMER_PASSWORD`.
7. **Cliquer Apply Config** : cliquez la message box `config …` (c’est l’action « apply »).
   L’indicateur (message box en-dessous) affiche `CONFIG OK` (ou `NOT CONFIGURED`).
8. **Lancer le clip MIDI** dans Ableton (canal 16).
9. **Voir les logs** : menu **Window → Max Console** dans le device (ou la fenêtre Max).
   Attendu : `radio-midi: receiving` → `ok <eventId> (<n> b64)` → `radio-midi: POST ok (200, decode)`.
10. **Vérifier la page publique** : la radio `/` affiche le message (titre, note, ticker,
    split-flap).

> Le clip MIDI doit être sur **canal 16** (le décodeur filtre canal 16 uniquement). Le
> panneau `/performer` génère déjà sur canal 16.

## 4. Câblage du patch (recette, pour comprendre / recâbler)

Le `.maxpat` implémente déjà ce câblage. Pour le refaire à la main :

```
[ midiin ]──▶[ midiparse ]──list [pitch vel chan]──▶[ js radio_midi_bridge.js ]──outlet0──▶[ prepend post ]──▶[ node.script radio_midi_poster.js ]──▶[ print radio-midi-poster ]
                          └── outlet1 (log) ─────────────────────────────────────▶[ print radio-midi-bridge ]

[ notein ]──3 outlets──▶[ pak i i i ]──list──▶[ js radio_midi_bridge.js ]   (chemin standalone)
```

- `midiin` → `midiparse` : intercepte le **flux de la piste** dans un MIDI Effect M4L
  (`notein` seul n’intercepte pas le flux de piste — il écoute un port MIDI). `midiparse`
  outlet 0 = notes `[pitch velocity channel]`.
- `notein` → `pak i i i` : chemin **standalone** (port MIDI / clavier virtuel). `notein`
  sort 3 outlets séparés (pitch, velocity, channel) → `pak` recompose une liste. Les listes
  intermédiaires (canal 0) sont filtrées par le bridge (`handleNote` ignore `chan !== 16`).
- `js radio_midi_bridge.js` : outlet 0 = `message` JSON validé, outlet 1 = log. Cochez
  **autowatch** dans l’inspecteur (recharge le script à la sauvegarde).
- `prepend post` : préfixe le JSON avec `post` → handler `post` du `node.script`.
- `node.script radio_midi_poster.js` : POST HTTP. Outlet = status.
- Config : message `config http://localhost:3001 <performerPassword>` → `node.script`.

## 5. Mode Send Now (sans clip MIDI)

Publier un message directement (sans MIDI), par ex. pour tester le POST :

```
[ message {"type":"track","mainTitle":"TEST","note":"Hello","displayMode":"paged"} ]
   ──▶ [ prepend sendnow ] ──▶ [ node.script radio_midi_poster.js ]
```

Le `node.script` reçoit le handler `sendnow`, parse le JSON, l’envoie tel quel au backend.
Aucun encodage MIDI nécessaire — c’est juste le formulaire `/performer` depuis Max.

> Le `message` doit être compatible `BroadcastInput` (même forme que le formulaire
> `/performer`). Le backend valide et renvoie 400 si invalide.

> **`sendnow` envoie le message radio nu compatible `BroadcastMessage`, pas le paquet
> `radio-midi-message` complet.** C’est le même objet `message` que le formulaire
> `/performer` envoie dans `POST /api/broadcast-message`.

✅ Correct — message nu (`BroadcastInput`) :

```json
{
  "type": "track",
  "mainTitle": "TEST MIDI",
  "note": "Depuis Max",
  "displayMode": "paged"
}
```

❌ Incorrect — paquet `radio-midi-message` complet (le backend renvoie 400) :

```json
{
  "protocol": "radio-midi-message",
  "version": 1,
  "eventId": "...",
  "message": { ... }
}
```

## 6. Sécurité — performerPassword

⚠️ **Ne jamais committer le mot de passe.** Le `node.script` ne lit pas de `.env` ; il
reçoit `backendUrl` + `performerPassword` via le message `config <url> <pw>`.

Bonnes pratiques :

- **Gardez le `.maxpat`/`.amxd` contenant le mot de passe en local uniquement** (hors git).
  Le dossier `tools/` est commité : ne sauvegardez **pas** le patcher avec le mot de passe
  écrit en clair dedans dans ce dépôt. Le `.maxpat` livré utilise `YOUR_PASSWORD_HERE`.
- Préférez charger le mot de passe depuis un **fichier local gitigné** (ex.
  `~/.radio-midi.conf` lu par un petit `message` au `loadbang`) plutôt que de le taper en
  dur dans le patch.
- Le `node.script` ne **logue jamais** le mot de passe (`max.post` n’affiche que `ok`/`(vide)`).
- En prod, utilisez l’URL HTTPS du backend.

## 7. Flux de réception (ce que fait `radio_midi_bridge.js`)

- Filtre **canal 16** uniquement (ignore 1–15).
- Ignore les **note-off** et les **note-on velocity 0**.
- **START (pitch 1)** : vide le buffer, `receiving = true`.
- **CLEAR (pitch 3)** : vide le buffer, `receiving = false`.
- Pendant `receiving` : n’accepte que les pitches **Base64 valides** (43–90, 97–122, 47,
  43, 61) ; accumule dans le buffer.
- **END (pitch 2)** : Base64 → UTF-8 → `JSON.parse` → valide
  `protocol/version/eventId/message` → vérifie le `checksum` (somme mod 65535, recalculée
  sur le Base64 du corps sans checksum) → **anti-dup `eventId`** (même eventId dans 2 s =
  `duplicate ignored`, non reposté) → sort le `message` JSON sur outlet 0.
- `test` (handler) : injecte un paquet de test fixe (sans checksum) et le décode via le
  même chemin — pour valider décodeur + POST **sans Ableton ni clip**.
- En cas d’erreur (décode, checksum, validation) : log sur outlet 1, **rien n’est posté**.

L’anti-duplication vit **côté Max** (le backend ignore l’origine MIDI).

> **`eventId`** : changez d’`eventId` quand le contenu change. Si le même `eventId` est
> rejoué dans les 2 secondes, le bridge le considère comme un doublon et ignore la
> republication (`duplicate ignored`).

> **Checksum** : il détecte une transmission incomplète/corrompue (notes manquantes),
> mais ce n’est pas une sécurité cryptographique.

## 8. Tests

### 8.1 Roundtrip logiciel (vérifie le protocole + writer .mid)

Depuis `apps/` : `npm run selfcheck:web` — vérifie encode/decode, accents français,
START/END, checksum, rejets, et le **writer .mid canal 16** (MThd type 0, note-on `0x9F`,
START+payload+END, end-of-track). Doit afficher `✅ web utils self-check OK`.

### 8.2 Test sans Ableton (bouton `test` du patch)

1. Ouvrez `radio-midi-message-bridge.maxpat` dans Max.
2. Cliquez la message box `config http://localhost:3001 <PERFORMER_PASSWORD>` →
   indicateur `CONFIG OK`.
3. Cliquez le bouton/message **`test`** → le bridge décode un paquet de test fixe →
   `radio_midi: ok test-local (328 b64)` → `radio-midi: POST ok (200, decode)` →
   la radio affiche `TEST LOCAL`.
4. (Optionnel) Cliquez `test` à nouveau dans les 2 s → `duplicate ignored test-local`
   (comportement normal de l’anti-dup). Cliquez `clear` pour reset puis re-`test`.

### 8.3 Test sans backend (valider le décodage seul)

Si le backend est éteint, le `test` ou le clip décode quand même (log `ok …`) mais le
`POST` échoue (`error … ECONNREFUSED` ou status d’erreur) — le message n’est pas publié,
ce qui est correct. Pour valider **uniquement le décodage** : observez la console Max,
cherchez `radio-midi: ok <eventId> (<n> b64)` (preuve que START+payload+END + checksum
sont bons). Le POST est indépendant.

### 8.4 Test avec Ableton + `.mid` généré

1. `/performer` → panneau **MIDI Message Bridge** → `eventId` (ex. `test-001`) →
   **Générer fichier MIDI data** → **Télécharger .mid**.
2. Ableton : importez le `.mid` sur une piste MIDI (canal 16), avec le device
   `radio-midi-message-bridge` (§3.2) chargé sur la piste.
3. Lancez le clip → console Max : `receiving` → `ok test-001 (<n> b64)` →
   `POST ok (200, decode)`.
4. Radio `/` affiche le message.

### 8.5 Test Send Now

Envoyez `config <url> <pw>` puis `sendnow {"type":"track","mainTitle":"TEST MIDI","note":"Depuis Max","displayMode":"paged"}`
au `node.script` → `POST ok (200, sendnow)` → la radio affiche le message.

## 9. Dépannage

| Symptôme | Cause / fix |
|---|---|
| **Pas de notes reçues** (`receiving` n’apparaît pas) | Clip pas lancé, ou canal ≠ 16. Vérifiez le canal du clip Ableton et le routage piste → device. En standalone, `midiin`/`notein` écoutent un port MIDI — sélectionnez le bon port. |
| **Mauvais canal MIDI** | Le bridge n’écoute que le canal 16. Régénérez le `.mid` depuis `/performer` (canal 16 garanti), ou forcez le clip sur canal 16. |
| **`error JSON parse`** | Clip tronqué / notes manquantes. Régénérez le `.mid`. |
| **`error checksum mismatch`** | Transmission incomplète (notes perdues). Le checksum détecte les drops. Régénérez/rejouez le clip. |
| **`duplicate ignored <eventId>`** | Normal : même `eventId` dans 2 s. Attendez > 2 s, cliquez `clear`, ou changez d’`eventId`. |
| **`POST échec 401`** | `performerPassword` absent/mauvais (message `config`). |
| **`POST échec 503`** | Backend sans `PERFORMER_PASSWORD` configuré (prod) — vérifiez `.env`. |
| **`POST échec 400`** | `message` pas compatible `BroadcastInput`. Voir le formulaire `/performer`. Pour `sendnow`, envoyer le **message nu**, pas le paquet radio-midi (§5). |
| **`POST échec` ECONNREFUSED / erreur réseau** | Backend éteint ou URL fausse. Vérifiez `config <url>` et que le backend tourne. |
| **`error payload > 4096`** | Message trop long (> 4096 Base64 ≈ 3 KB JSON). Raccourcir. |
| **Indicateur `NOT CONFIGURED`** | Cliquez un message `config <url> <pw>` (les deux champs doivent être non vides). |
| **`node.script` rouge** | Activez Node for Max (Preferences → Max → Node for Max). |
| **`error pitch invalide <n>`** | Note hors plage Base64 pendant `receiving`. Clip corrompu ou autre source MIDI sur canal 16. |

## 10. Limites v1

- Pas de retransmission auto : si le POST échoue, relancer le clip (ou `sendnow`/`test`).
- Le MIDI ne transporte **pas** l’audio — LiveKit gère l’audio (chaîne existante).
- Adapté aux titres/notes/tickers/métadonnées, **pas** aux longs textes.
- `.maxpat` livré (pas de `.amxd` : à sauver comme Max for Live MIDI Effect depuis Max, §3.2).
- `radio_midi_bridge.js` est un **miroir** de la lib TS ; si le protocole évolue, mettre à
  jour les deux (checksum, validation, constantes).
- Le chemin standalone `notein` + `pak` peut émettre quelques listes intermédiaires (canal
  0) : elles sont filtrées par le bridge. Le chemin M4L `midiin` + `midiparse` est préféré
  dans Ableton.