# Messire Paulochon

Jeu de plateforme pour enfants dans l'esprit des BD de gags : Messire Paulochon part retrouver la princesse Mimicracra… et finit souvent en **GAME OVER**. Chaque façon de perdre remplit l'album des morts.

Jouable sur iPad et ordinateur, dans le navigateur.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir l'adresse affichée. Pour tester sur l'iPad, utiliser l'adresse « Network » (même Wi-Fi).

## Commandes de jeu

- **Ordinateur** : ← → (ou Q / D) pour marcher, Espace pour sauter, X pour taper.
- **iPad** : boutons à l'écran ◀ ▶, SAUT, TAPER.

## Mettre en ligne (GitHub Pages)

Dépôt : `git@github.com:FloFrad/game-over.git`

1. Sur GitHub : **Settings → Pages → Source : GitHub Actions** (une seule fois).
2. Chaque push sur `main` publie le jeu sur `https://flofrad.github.io/game-over/`.

## Documentation

- `CLAUDE.md` — contexte et règles pour Claude Code
- `docs/GAME_DESIGN.md` — personnages, objets, morts, plan des 12 niveaux
- `docs/STYLE_GUIDE.md` — palette, polices, règles des dessins
- `docs/ROADMAP.md` — ce qui est fait / à faire
- `docs/prototype/niveau-1-prototype.html` — prototype complet du niveau 1 (référence)
