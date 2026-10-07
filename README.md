# Messire Paulochon

Jeu de plateforme pour enfants dans l'esprit des BD de gags : Messire Paulochon part retrouver la princesse Mimicracra… et finit souvent en **GAME OVER**. Chaque façon de perdre remplit l'album des morts.

Jouable sur iPad et ordinateur, dans le navigateur (et hors connexion une fois installé depuis Safari : Partager → Sur l'écran d'accueil).

**Le jeu est complet** : 12 niveaux dans 4 mondes (forêt, marais, château glacé, volcan), 4 boss, 31 morts à collectionner, et une fin… ratée.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir l'adresse affichée. Pour tester sur l'iPad, utiliser l'adresse « Network » (même Wi-Fi).

Autres commandes : `npm run build` (typecheck + build dans `dist/`), `npm run preview`, `npm run typecheck`.
En mode dev, `window.game` est exposé dans la console, par exemple `game.scene.start('Level', { levelId: 9 })` pour sauter à un niveau.

## Commandes de jeu

- **Ordinateur** : ← → (ou Q / D) pour marcher, Espace pour sauter, X pour taper (épée, poêle ou boomerang).
- **iPad** : boutons à l'écran ◀ ▶, SAUT, TAPER.
- Échap ou P : pause.
- **Cheat code** : dans l'album des morts, taper `EFFACE` au clavier active le mode effacement (les cases rougissent et tremblent) ; toucher une case la remet à « ? ». Retaper `EFFACE` (ou fermer l'album) pour sortir.
- Deux modes : **Petit chevalier** (~5 ans : plus lent, boss à 2 cœurs) et **Grand chevalier** (~10 ans).

## Mettre en ligne (GitHub Pages)

Dépôt : `git@github.com:FloFrad/game-over.git`

1. Sur GitHub : **Settings → Pages → Source : GitHub Actions** (une seule fois).
2. Chaque push sur `main` (pensez à changer `VERSION` dans `public/sw.js` à chaque release) publie le jeu sur `https://flofrad.github.io/game-over/`.

## Documentation

- `CLAUDE.md` — contexte et règles pour Claude Code
- `docs/GAME_DESIGN.md` — personnages, objets, modes, plan des 12 niveaux et des 31 morts
- `docs/STYLE_GUIDE.md` — palette, polices, règles des dessins
- `docs/ROADMAP.md` — ce qui est fait / à faire
- `docs/prototype/niveau-1-prototype.html` — prototype complet du niveau 1 (référence)
