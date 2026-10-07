# Roadmap

## v0.1 — Fondations (fait)

- [x] Projet Phaser 4 + TypeScript + Vite, déploiement GitHub Pages
- [x] Personnages SVG extraits de la planche de style
- [x] Format de niveau ASCII + niveau 1 complet (carte)
- [x] Héros : course, saut (coyote time, mémoire du saut, saut court)
- [x] Gloumpfs : patrouille, écrasés en sautant dessus → mort « câlin collant » sinon
- [x] Trous → mort « grand plongeon »
- [x] Potion Géante : casse les caisses, mort « plafond trop bas » si on saute sous la roche
- [x] Drapeaux de sauvegarde, princesse = fin du niveau
- [x] Album des morts (localStorage), écran GAME OVER, écran de victoire
- [x] Contrôles clavier (AZERTY + QWERTY) et boutons tactiles

## v0.2 — Niveau 1 complet (fait)

Comportement et réglages repris du prototype `docs/prototype/niveau-1-prototype.html` :

- [x] **Épée en bois** (`S`) : ramassage, bouton TAPER, tue les Gloumpfs, casse après 4 coups (« CRAC ! »), icône + coups restants dans le HUD
- [x] **Peau de banane** (`B`) : glissade forcée 1,3 s → mort « peau de banane » si on tombe dans un trou pendant/juste après
- [x] **Enclumes** (`A`) : ombre qui grossit + « ! » + sifflement, puis chute → mort « enclume du destin ». 1re enclume sur le héros, 2e un peu devant lui
- [x] **Potion Plume** (`F`) : vol (garder SAUT appuyé), ailes animées, barre de durée ; oiseau qui patrouille en haut → mort « oiseau affamé » si on monte trop haut
- [x] **Ronchon** (`R`) : endormi (Zzz), bloque le pont ; le toucher ou le taper → éternuement « ATCHOUM ! » qui envoie le héros dans les airs → mort « réveil du Ronchon »
- [x] Bulles de la princesse (« Tu es encore vivant, toi ? »)
- [x] Écran Album des morts (grille des cases, morts secrètes en « ? »)
- [x] Sons (WebAudio simple comme dans le prototype, bouton couper le son)
- [x] Pause (Échap / P / bouton)
- [x] **Case de BD après chaque mort** : grande illustration en rapport avec la mort (crâne si on est écrasé, peau de banane géante, oiseau qui emporte le héros…), affichée ~3 s juste avant le menu REJOUER, puis rangée en vignette ; les mêmes cases remplissent l'album

À faire plus tard (idées) : la case pourrait s'animer (le héros qui glisse, l'enclume qui tombe) ; une case par défaut plus drôle pour les morts sans dessin.

## v0.3 — Finitions iPad (code fait, reste le test sur l'appareil)

- [ ] **Test sur iPad réel (Safari)** : taille des boutons, multi-touch, performances, son. À faire à la main : `npm run dev` puis ouvrir `http://<ip-du-mac>:5173` sur l'iPad (même Wi-Fi), ou tester la version publiée.
- [x] PWA : manifeste + icône (`public/manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png`), plein écran depuis l'écran d'accueil (Safari : Partager → Sur l'écran d'accueil), hors connexion grâce à `public/sw.js` (à ouvrir une première fois en ligne). Changer `VERSION` dans `sw.js` à chaque release.
- [x] Message « tourne la tablette » en portrait (tablettes et téléphones seulement) ; le jeu se met en pause derrière
- [x] Carte du royaume (4 mondes × 3 niveaux, cadenas pour les niveaux pas encore faits, étoile sur les niveaux terminés, progression sauvegardée) ; les boutons MENU/CARTE y ramènent

Pour ajouter un niveau : sa carte dans `src/levels/`, l'inscrire dans `levels/index.ts` (le monde est déjà dans `data/worlds.ts`).

## v0.4 → v1.0 — Le jeu complet (fait, reste le test sur iPad)

- [x] **12 niveaux, 4 mondes** (forêt, marais, château glacé, volcan), chacun avec son thème visuel, ses pièges et son boss
- [x] **31 morts** dans l'album (une case de BD illustrée chacune), album en pages de 8 avec flèches
- [x] Monde 1 : ruches et abeilles, champignon qui rebondit / champignon qui rebondit TROP, pont de lianes ; boss **Maman Gloumpf** (saute-lui sur la tête)
- [x] Monde 2 : potion **Minus** (tunnels d'une case), escargots, sables mouvants (SAUT pour remonter), grenouilles à langue, nénuphars qui coulent, moustiques ; boss **Crapouille** (grands bonds, ombre au sol)
- [x] Monde 3 : glace glissante, stalactites, bonshommes de neige qui éternuent, armures, **poêle à frire** (renvoie les boules… parfois sur soi), potion **Fantôme**, portes-bouches ; boss **Gros Floc** (renvoyer ses boules de neige)
- [x] Monde 4 : lave, planches pourries, dragons qui éternuent, **boomerang** (qui revient !), pont de pierre qui s'effondre, coffres qui mordent ; boss **le Ronchon** (boomerang + sauter les cailloux de sa massue)
- [x] Fin du jeu : la princesse ouvre la trappe par erreur → dernière case « Le sauvetage raté », écran FIN
- [x] Écran de victoire avec bouton « niveau suivant », carte avec cadenas selon la progression
- [x] Hors connexion : tous les nouveaux sprites sont dans le cache du service worker (`VERSION` = `paulochon-v1.0`)
- [x] Réglages après premiers essais : l'oiseau de la Plume disparaît 8 s (Petit) / 4 s (Grand) après son passage et n'attrape que s'il est tout près ; boss du « Petit chevalier » à 2 cœurs, plus lents et sonnés plus longtemps (`bossCalm`, `birdPause` dans `MODES`)
- [ ] **Test sur iPad réel** : multi-touch, performances sur les niveaux chargés (monde 4), taille des boutons, son
- [ ] Équilibrage avec de vrais enfants (5 et 10 ans) : durées d'alerte, vitesse des monstres (`MODES` dans `config.ts`)

Idées pour la suite : cases de BD animées, niveaux bonus, une musique, un mode « 2 joueurs ».
