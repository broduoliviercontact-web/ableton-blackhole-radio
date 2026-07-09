# Definition of Done

## Niveau Story

Une story est Done quand :
1. Code implémente toutes ses FR/DoD listées.
2. Compile sans erreur TS (`tsc --noEmit` sur l'app concernée).
3. Le check minimal/runnable de la story passe (cf. ci-dessous).
4. Aucune régression : `npm run dev` démarre web+server sans erreur.
5. Pas de fonctionnalité non demandée (YAGNI).
6. Commit petit, lisible, message au présent.
7. Messages d'erreur utilisateur explicites si la story touche un cas d'erreur.

## Check minimal par story (lazy self-check)

Chaque fonction audio/logique non-triviale laisse UN check runnable :

| Story | Check |
|-------|-------|
| US-1.1 | `curl /api/health` → 200 |
| US-1.3 | décodage du token retourné → grants attendus |
| US-1.2 | démarrage sans `LIVEKIT_API_SECRET` → exit + message |
| US-2.1 | après permission, `enumerateDevices` contient ≥1 `audioinput` |
| US-2.2 | `startCapture` retourne un `MediaStream` avec 1 track audio |
| US-2.3 | vumètre > 0 sur un signal sonore |
| US-2.4 | `audioTrackPublications.size === 1` après Start |
| US-3.1 | son audible côté listener quand performer joue |
| US-3.2 | badge passe à `offline` sur déconnexion |
| US-3B.1 | `/api/config-check` renvoie des booléens, aucun secret |
| US-4.3 | `selfcheck:server` + `selfcheck:web` passent |

Pas de framework de test imposé. Un `assert` ou un check manuel
documenté suffit. Une suite `test_*.ts` only si la story le demande explicitement.

## Niveau Lot

Un lot est Done quand :
1. Toutes ses stories sont Done.
2. Le flux du lot fonctionne end-to-end (pas seulement par morceaux).
3. `docs/bmad/stories.md` à jour (coches).
4. Pas de TODO/FIXME laissés dans le code livré.

## Niveau Projet

Le projet est Done quand :
1. Tous les lots Done.
2. Les cas d'erreur (PRD §4) produisent le bon message.
3. Parcours complet reproductible : choisir une entrée audio → Start → ouvrir
   `/listen` → son entendu, latence < 1s. Le parcours fonctionne avec un micro
   intégré, une carte son ou une entrée virtuelle (BlackHole/Loopback).
4. `.env.example` complet, README monorepo + manuel de test présents.
5. Aucun secret dans le frontend (`grep -r API_SECRET web/src` → vide).
6. Fonctionne en `localhost` dev ; prod HTTPS documentée (non implémentée).

## Critères d'erreur explicites (PRD §4)

Chaque cas doit être testé et produire EXACTEMENT le message prévu :

- [ ] Aucun device audio
- [ ] Permission micro refusée
- [ ] Connexion LiveKit échouée (URL factice)
- [ ] Connexion LiveKit échouée (URL réelle)
- [ ] Token invalide / 4xx

Note : il n'y a **pas** de cas « BlackHole non sélectionné ». La diffusion
démarre avec n'importe quelle entrée ; un micro intégré déclenche seulement
une note douce non bloquante (PRD FR-8), jamais une erreur.