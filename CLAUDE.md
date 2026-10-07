# Messire Paulochon — CLAUDE.md

Jeu de plateforme 2D pour enfants (5 et 10 ans), joué sur **iPad (Safari) et ordinateur**.
Esprit « gags en une page » : le héros meurt de façon absurde et drôle, et **chaque mort débloque une case de l'album des morts**. Perdre est une récompense.

## Commandes

```bash
npm install
npm run dev        # serveur Vite (http://localhost:5173, accessible depuis l'iPad sur le même Wi-Fi grâce à --host)
npm run build      # typecheck + build dans dist/
npm run preview    # sert dist/ en local
npm run typecheck
```

Déploiement : push sur `main` → GitHub Actions (`.github/workflows/deploy.yml`) publie `dist/` sur GitHub Pages.

## Stack

- **Phaser 4** (Arcade Physics) + **TypeScript** strict + **Vite**.
- Pas de backend. Sauvegarde (album, préférences) dans `localStorage`, toujours dans un `try/catch`.
- Résolution logique 960×540, `Scale.FIT`, centrée.

## Architecture

```
src/
  main.ts                 config Phaser, liste des scènes
  config.ts               dimensions, couleurs, physique, modes Petit/Grand, liste des sprites
  data/deaths.ts          catalogue des morts (id, n°, onomatopée, texte)
  levels/types.ts         format ASCII des niveaux + parseLevel() + légende des caractères
  levels/level1.ts        niveau 1 (12 × 112 cases)
  objects/Hero.ts         héros : course, saut (coyote time, mémoire du saut, saut court), Géant
  objects/Gloumpf.ts      monstre de base : patrouille, demi-tour au bord du vide
  scenes/BootScene.ts     charge les SVG (rasterisés à 2×), génère les textures, attend les polices
  scenes/TitleScene.ts    choix du mode
  scenes/LevelScene.ts    construction du niveau, collisions, morts, victoire, HUD
  scenes/ResultScene.ts   panneau GAME OVER / niveau réussi
  systems/Controls.ts     clavier (flèches, WASD, ZQSD, Espace, X/E) + tactile unifiés
  systems/album.ts        album des morts (localStorage)
  ui/                     onomatopées, boutons BD, boutons tactiles
  gfx/textures.ts         tuiles et décor dessinés au démarrage
public/assets/svg/        personnages et objets (SVG, style planche)
docs/                     game design, style, roadmap, prototype HTML de référence
```

## Règles à respecter

1. **Personnages originaux uniquement.** Le jeu s'inspire de l'esprit des gags de BD, mais ne reprend ni les personnages, ni les noms, ni le look d'une BD existante (pas de « Petit Barbare », pas de « Blorks »). Nos personnages : Messire Paulochon, Princesse Mimicracra, Gloumpfs, Ronchon.
2. **Adapté aux enfants.** Morts cartoon, jamais de sang ni de vraie violence : « pouf », fantôme avec auréole, onomatopées. Le joueur de 5 ans ne lit pas : tout doit se comprendre sans texte (icônes, sons, animations). Le texte est un bonus.
3. **Jamais frustrant.** Réapparition immédiate au dernier drapeau, potions qui réapparaissent, pas de vies limitées. Un piège doit être lisible avant de tuer (ombre, bruit, animation d'alerte).
4. **Tablette d'abord.** Boutons tactiles ≥ 64 px, multi-touch (courir + sauter), pas de survol nécessaire, testé en paysage. Viser 60 i/s sur un iPad de quelques années : peu d'objets physiques, textures pré-rasterisées.
5. **Style graphique** (docs/STYLE_GUIDE.md) : contour noir épais (6 px dans les SVG), aplats, palette fixe, polices Bangers (titres, onomatopées) et Patrick Hand (textes).
6. **Données plutôt que code.** Un niveau = une carte ASCII + des listes ; une mort = une entrée dans `data/deaths.ts`. Ajouter un piège = un caractère dans la légende + son comportement dans `LevelScene`.
7. Textes du jeu et commentaires en **français**.

## Avant de dire qu'une tâche est finie

- `npm run build` passe (typecheck strict compris).
- Tester dans le navigateur : le niveau se finit, chaque mort concernée se déclenche et apparaît dans l'album.
- En mode dev, `window.game` est exposé : `game.scene.getScene('Level').hero.arcade.reset(x, y)` pour se téléporter.

## Où en est-on

Voir **docs/ROADMAP.md**. Le prototype complet du niveau 1 (toutes les mécaniques, en un seul fichier HTML/Canvas) est dans `docs/prototype/niveau-1-prototype.html` : s'en servir comme référence de comportement et de réglages (vitesses, durées, gags).
