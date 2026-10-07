# Style graphique

Référence visuelle : la planche de style (canvas Claude) — https://claude.ai/artifact/KgUBPPV1T5HSAP17pa6FBR

## Principes

- **Esprit BD franco-belge pour enfants** : gros contours noirs, aplats de couleurs franches, personnages à grosse tête, expressions exagérées.
- Pas de dégradés, pas d'ombres réalistes, pas de textures photo. Une ombre portée = ellipse noire à ~15 % d'opacité.
- Onomatopées en **Bangers**, jaunes ou blanches, gros contour noir, légèrement penchées, apparition « pop ».
- Fonds en **trame de points** légère (effet impression BD).

## Palette

| Nom | Hex | Usage |
|---|---|---|
| Encre | `#1A1A1A` | contours, textes |
| Papier | `#FFF8E7` | panneaux, cases |
| Ciel | `#7EC8F0` | ciel |
| Tomate | `#E63B2E` | tunique du héros, GAME OVER, danger |
| Banane | `#FFD23F` | onomatopées, boutons principaux, objets |
| Lagon | `#2BB3A3` | robe de la princesse |
| Gloumpf | `#C2389A` | monstres de base |
| Herbe | `#6CC04A` | herbe, feuillages |

## Typographies (Google Fonts)

- **Bangers** — titres, onomatopées, boutons.
- **Patrick Hand** — bulles, textes, consignes.

## Règles pour les SVG (public/assets/svg)

- Un fichier par personnage / objet, `viewBox` serré autour du dessin.
- Contour : `stroke="#1A1A1A" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"` sur un `<g>` racine.
- Couleurs uniquement de la palette (+ teintes de peau / bois / métal déjà utilisées).
- Le personnage regarde **vers la droite** par défaut (le jeu le retourne).
- Ajouter le rapport du `viewBox` dans `RATIOS` (BootScene) et la hauteur affichée dans `SPRITES` (config.ts).

## Propriété intellectuelle

Le jeu s'inspire de l'humour des BD de gags, mais tous les personnages, noms et designs sont **originaux**. Ne jamais reproduire les personnages, monstres ou logos d'une BD ou d'un jeu existant.
