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

## Les 12 niveaux

| Niv. | Nom | Nouveautés | Morts (n°) |
|---|---|---|---|
| 1 | La forêt des Gloumpfs | Gloumpfs, épée, banane, Géante, enclumes, Plume, Ronchon endormi | câlin collant (1), grand plongeon (2), peau de banane (3), plafond trop bas (4), enclume (5), oiseau affamé (6), réveil du Ronchon (7) |
| 2 | Le chemin des abeilles | ruches, champignons (rouge = ressort, rose = TROP), pont de lianes | ruche dérangée (8), champignon trop rebondissant (9), liane qui casse (10) |
| 3 | Maman Gloumpf | **boss** : saute-lui 3 fois sur la tête, elle crache de la gelée | gros câlin de Maman Gloumpf (11) |
| 4 | Le marais gluant | potion **Minus**, tunnel d'une case, escargots, sables mouvants | escargot écraseur (12), sables mouvants (13) |
| 5 | La mare aux nénuphars | grenouilles (gorge qui gonfle puis langue), nénuphars qui coulent, moustiques | nénuphar qui coule (14), grenouille gourmande (15) |
| 6 | Crapouille | **boss** : grands bonds avec ombre au sol, sauter sur son dos | moustique géant (16), Crapouille s'assoit dessus (17) |
| 7 | La glace et les stalactites | glace glissante, stalactites qui tremblent | glissade sans fin (18), stalactite (19) |
| 8 | Les bonshommes de neige | bonshommes de neige qui éternuent, armures, **poêle** (renvoie), potion **Fantôme** | bonhomme de neige (20), armure (21), poêle (22) |
| 9 | Gros Floc | portes qui ont des dents, **boss** : renvoyer ses boules à la poêle | porte qui a faim (23), Gros Floc (24) |
| 10 | Les rivières de lave | lave, planches pourries, dragons qui éternuent | bain de lave (25), dragon (26) |
| 11 | Le pont de pierre | **boomerang**, pont qui s'effondre, coffres qui mordent | boomerang (27), pont (28), coffre (29) |
| 12 | Le Ronchon | **boss final** : boomerang dans la figure, sauter les cailloux de la massue ; puis la princesse | massue du Ronchon (30), sauvetage raté (31) |

### Mécaniques à retenir

- **Chaque piège s'annonce** : ruche qui tremble, gorge de la grenouille qui gonfle, « ! » au-dessus du monstre, ombre au sol (stalactite, Crapouille), porte qui entrouvre sa bouche, coffre qui tremble, planche qui s'enfonce.
- **Boss** : 3 cœurs (Petit) ou 4 (Grand). Après chaque coup le boss est sonné et inoffensif un moment. La herse d'entrée se ferme derrière le héros, celle de sortie s'ouvre à la victoire. Un drapeau juste avant l'arène : on rejoue le combat sans refaire le niveau.
- **Un seul outil en main** : épée (4 coups), poêle (renvoie les boules de neige/feu ; si personne ne les reçoit, elles reviennent : « BONG ! »), boomerang (le « Petit chevalier » l'attrape tout seul au sol ; le « Grand » doit appuyer sur TAPER au bon moment).
- **Potions** (une seule active à la fois, elles réapparaissent) : Géante, Plume, Minus (passe les tunnels d'une case, ne finit pas tant qu'on est coincé), Fantôme (les monstres ne le voient pas).
- **Fin du jeu** : le héros sauve enfin la princesse… qui ouvre une trappe par erreur. Dernière case de l'album : « Le sauvetage raté ».
