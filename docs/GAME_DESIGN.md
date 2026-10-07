# Game design — Messire Paulochon

## Concept

Un petit chevalier têtu traverse des niveaux courts pour retrouver la princesse Mimicracra… et meurt souvent, toujours de façon drôle. Comme dans une BD de gags, **la chute est le spectacle** : chaque mort affiche une grande case « GAME OVER » avec une onomatopée, puis s'ajoute à l'**album des morts**. Les enfants voudront tout essayer pour remplir l'album.

- Public : enfants de **5 ans** (ne lit pas encore) et **10 ans**.
- Appareils : iPad (paysage, tactile) et ordinateur (clavier).
- Parties courtes : un niveau = 2 à 4 minutes.

## Modes de difficulté

| | Petit chevalier (≈ 5 ans) | Grand chevalier (≈ 10 ans) |
|---|---|---|
| Vitesse du héros | 230 | 265 |
| Vitesse des Gloumpfs | 45 | 85 |
| Alerte avant une enclume | 1,5 s | 0,85 s |
| Durée potion Géante | 13 s | 9 s |
| Durée potion Plume | 10 s | 7 s |

Réglages dans `src/config.ts` (`MODES`).

## Personnages

- **Messire Paulochon** — le héros. Casque-casserole (CLONG !), épée en bois réparée au sparadrap. Très courageux, pas du tout prudent.
- **Princesse Mimicracra** — couronne trop petite et de travers, lance-pierre toujours chargé, bulle de chewing-gum. Ne veut pas être sauvée… mais aide parfois. Réplique : « Encore toi ?! »
- **Les Gloumpfs** — petits monstres gluants à un œil, deux antennes, une dent. Toujours en bande. Avalent tout.
- **Le Ronchon** — troll de pierre couvert de mousse, fait la sieste sur les ponts, massue = un arbre entier. Boss.

## Objets

| Objet | Pouvoir | Gag / mort possible |
|---|---|---|
| Potion Géante (rouge) | devient énorme, casse les caisses, écrase les Gloumpfs | se cogne au plafond : BONK ! |
| Potion Minus (bleue) | passe dans les petits trous | écrasé par un escargot |
| Potion Fantôme (blanche) | invisible pour les monstres | le Ronchon lui marche dessus sans le voir |
| Potion Plume (jaune) | vole quelques secondes | un oiseau affamé : MIAM ! |
| Épée en bois | tape les Gloumpfs | casse au pire moment : CRAC ! |
| Poêle à frire | renvoie les projectiles | les renvoie parfois sur soi : BONG ! |
| Boomerang | touche de loin | revient en pleine figure : TOC ! |

## Règles anti-frustration

- Pas de vies : on réapparaît au dernier drapeau, tout de suite.
- Un piège s'annonce toujours (ombre, son, tremblement) avant de tuer.
- Les potions nécessaires pour avancer réapparaissent.
- Une mort déjà vue reste drôle (animation) mais rapide à passer.

## Niveau 1 — La forêt des Gloumpfs (7 morts)

1. **Le câlin collant** — toucher un Gloumpf de côté (SCHLOURP !)
2. **Le grand plongeon** — tomber dans un trou
3. **La peau de banane** — glisser jusque dans un trou (ZIOUUU !)
4. **Le plafond trop bas** — sauter en Géant dans le tunnel (BONK !)
5. **L'enclume du destin** — rester sous l'ombre (CLONG !)
6. **L'oiseau affamé** — voler trop haut avec la Plume (MIAM !)
7. **Le réveil du Ronchon** — toucher le troll endormi (ATCHOUM !)

Parcours : départ → Gloumpfs → trou → épée sur une planche → peau de banane + trou → potion Géante → mur de caisses → tunnel bas → 2 enclumes → potion Plume → Ronchon sur le pont → château, princesse.

## Plan des 12 niveaux (proposition)

| Monde | Niveaux | Nouveautés | Idées de morts |
|---|---|---|---|
| 1. Forêt des Gloumpfs | 1–3 | Gloumpfs, Géante, Plume, épée | câlin collant, banane, enclume, ruche dérangée, champignon rebondissant trop fort, liane qui casse |
| 2. Marais gluant | 4–6 | Potion Minus, sables mouvants, grenouilles | escargot écraseur, sables mouvants (GLOUP), nénuphar qui coule, grenouille qui gobe le héros, moustique géant |
| 3. Château glacé | 7–9 | glace glissante, Poêle à frire, potion Fantôme | glissade sans fin, stalactite (CLING), bonhomme de neige qui éternue, armure qui se réveille, porte qui est une bouche |
| 4. Volcan | 10–12 | lave, boomerang, Ronchon boss final | boomerang en pleine figure, pont qui s'effondre, dragon qui éternue, coffre au trésor qui mord, la princesse appuie sur le mauvais bouton (fin) |

Fin du jeu : le héros sauve enfin la princesse… qui ouvre une trappe par erreur. Dernière case de l'album : « Le sauvetage raté ».
