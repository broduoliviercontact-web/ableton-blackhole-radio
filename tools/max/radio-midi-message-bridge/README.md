# Radio MIDI Message Bridge — Outils Max / Max for Live

Décode les **clips MIDI « data »** générés par le panneau **MIDI Message Bridge** de
`/performer` (ou par un clip Ableton synchronisé) et les **POST** à l’endpoint existant
`/api/broadcast-message`. La radio publique (`/`, `/listen`) affiche alors le message via
le split-flap existant — **aucune différence** côté site.

> Protocole complet : [`apps/docs/radio-midi-message-bridge.md`](../../apps/docs/radio-midi-message-bridge.md).
> Lib TS de référence : `apps/web/src/lib/radioMidiMessageProtocol.ts`.

## 1. Fichiers

| Fichier | Rôle | Objet Max |
|---|---|---|
| `radio_midi_bridge.js` | **Décodeur MIDI** temps-réel : notein → buffer → Base64 → JSON → validation → checksum → anti-dup `eventId`. Sort le `message` JSON validé sur outlet 0. | `js` (pas Node) |
| `radio_midi_poster.js` | **Couche HTTP** : reçoit le `message` JSON, POST `{performerPassword, message}` à `/api/broadcast-message`. | `node.script` (Node for Max) |

> **Pas de `.maxpat` livré.** Un `.maxpat` écrit à la main est fragile (coordonnées, noms
> d’objets, version Max) et risquerait de charger un patch cassé. On livre la logique JS
> (fiable) + la recette de câblage ci-dessous (5 objets, 3 connexions). Reconstruire le
> patch prend 2 minutes et reste sous votre contrôle — notamment pour **le mot de passe,
> qui ne doit jamais être commité**.

## 2. Pré-requis

- **Max 8** (ou Max for Live) avec **Node for Max** activé (Preferences → Max → Node for Max).
- Le **backend** en route (local : `npm run build:server && npm run dev` depuis `apps/`,
  PORT 3001 ; ou l’URL de prod).
- Un **performerPassword** configuré côté serveur (`PERFORMER_PASSWORD` / `PERFORMER_PASSWORDS`).
- Le panneau **MIDI Message Bridge** de `/performer` pour générer un `.mid` de test, ou un
  clip MIDI « data » dans Ableton (canal 16, notes START/payload/END).

## 3. Câblage du patch (mode MIDI Decoder)

```
[ notein 16 ]──list [pitch vel chan]──▶[ js radio_midi_bridge.js ]
                                            │ outlet 0 : message JSON
                                            ▼
                                  [ prepend post ]
                                            ▼
                       [ node.script radio_midi_poster.js ]──status──▶[ print ]
```

Étapes :

1. **`notein`** — créez l’objet `notein`. Dans l’inspecteur, fixez le canal à **16**
   (ou laissez tous canaux et laissez `radio_midi_bridge.js` filtrer). L’objet sort une
   liste `[pitch velocity channel]`.
2. **`js radio_midi_bridge.js`** — créez un objet `js`, chargez `radio_midi_bridge.js`
   (même dossier). Cochez **autowatch** dans l’inspecteur (recharge à la sauvegarde).
   - Outlet 0 → `message` JSON validé.
   - Outlet 1 → statut/log.
3. **`prepend post`** — objet `prepend post`. Préfixe le JSON du décodeur avec le mot
   `post` → le `node.script` reçoit le handler `post`.
4. **`node.script radio_midi_poster.js`** — objet `node.script` pointant vers
   `radio_midi_poster.js`. Outlet → `print` (statut HTTP).
5. **Config** — envoyer au `node.script` le message : `config http://localhost:3001 <performerPassword>`
   (voir §5 sécurité). À envoyer à l’ouverture du patch (via un `loadbang` → `message`).

Connexions : `notein` → `js` ; `js` outlet 0 → `prepend post` → `node.script` ;
`node.script` outlet → `print`. Branchez aussi `js` outlet 1 → un second `print` pour le log.

## 4. Mode Send Now (sans clip MIDI)

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

## 5. Sécurité — performerPassword

⚠️ **Ne jamais committer le mot de passe.** Le `node.script` ne lit pas de `.env` ; il
reçoit `backendUrl` + `performerPassword` via le message `config <url> <pw>`.

Bonnes pratiques :

- **Gardez le `.maxpat` contenant le mot de passe en local uniquement** (hors git). Le
  dossier `tools/` est commité : ne sauvegardez **pas** le patcher avec le mot de passe
  écrit en clair dedans dans ce dépôt.
- Préférez charger le mot de passe depuis un **fichier local gitigné** (ex.
  `~/.radio-midi.conf` lu par un petit `message` au `loadbang`) plutôt que de le taper en
  dur dans le patch.
- Le `node.script` ne **logue jamais** le mot de passe (`max.post` n’affiche que `ok`/`(vide)`).
- En prod, utilisez l’URL HTTPS du backend.

## 6. Flux de réception (ce que fait `radio_midi_bridge.js`)

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
- En cas d’erreur (décode, checksum, validation) : log sur outlet 1, **rien n’est posté**.

L’anti-duplication vit **côté Max** (le backend ignore l’origine MIDI).

> **`eventId`** : changez d’`eventId` quand le contenu change. Si le même `eventId` est
> rejoué dans les 2 secondes, le bridge le considère comme un doublon et ignore la
> republication (`duplicate ignored`).

> **Checksum** : il détecte une transmission incomplète/corrompue (notes manquantes),
> mais ce n’est pas une sécurité cryptographique.

## 7. Test sans Ableton

### 7.1 Roundtrip logiciel (vérifie le protocole)

Depuis `apps/` : `npm run selfcheck:web` — vérifie encode/decode, accents français, START/END,
checksum, rejets, et le **writer .mid canal 16** (MThd type 0, note-on `0x9F`, START+payload+END,
end-of-track). Doit afficher `✅ web utils self-check OK`.

### 7.2 Test Max avec un `.mid` généré

1. `/performer` → panneau **MIDI Message Bridge** → `eventId` (ex. `test-001`) →
   **Générer fichier MIDI data** → **Télécharger .mid**.
2. Dans Ableton (ou un lecteur MIDI virtuel) : chargez le `.mid` sur une **piste MIDI dont
   la sortie va vers le `notein`** de Max (canal 16). Ou injectez les notes via `seq`/`borax`.
3. Lancez la lecture du clip → `radio_midi_bridge.js` log `receiving` puis
   `ok test-001 (<n> b64)` → `radio_midi_poster.js` log `POST ok (200, decode)`.
4. Le site public `/` affiche le message (titre, note, ticker, split-flap).

### 7.3 Test Send Now

Envoyez `config <url> <pw>` puis `sendnow {"type":"track","mainTitle":"TEST MIDI","note":"Depuis Max","displayMode":"paged"}`
au `node.script` → `POST ok (200, sendnow)` → le site affiche le message.

## 8. Dépannage

| Symptôme | Cause / fix |
|---|---|
| Rien ne sort du `js` | `notein` pas sur canal 16, ou `node.script` pas `config`-uré. Vérifiez outlet 1 (log). |
| `error JSON parse` | Clip tronqué / notes manquantes. Régénérez le `.mid`. |
| `error checksum mismatch` | Transmission incomplète. Le checksum détecte les drops de notes. |
| `duplicate ignored` | Normal : même `eventId` dans 2 s. Attendez ou changez d’`eventId`. |
| `POST échec 401` | `performerPassword` absent/mauvais (config). |
| `POST échec 503` | Backend sans `PERFORMER_PASSWORD` configuré (prod). |
| `POST échec 400` | `message` pas compatible `BroadcastInput`. Voir le formulaire `/performer`. |
| `error payload > 4096` | Message trop long (> 4096 Base64 ≈ 3 KB JSON). Raccourcir. |

## 9. Limites v1

- Pas de retransmission auto : si le POST échoue, relancer le clip (ou `sendnow`).
- Le MIDI ne transporte **pas** l’audio — LiveKit gère l’audio (chaîne existante).
- Adapté aux titres/notes/tickers/métadonnées, **pas** aux longs textes.
- Pas de `.maxpat` livré (recette §3) — évite un patch cassé et protège le mot de passe.
- `radio_midi_bridge.js` est un **miroir** de la lib TS ; si le protocole évolue, mettre à
  jour les deux (checksum, validation, constantes).