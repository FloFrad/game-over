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

## v0.3 — Finitions iPad

- [ ] Test sur iPad réel (Safari) : taille des boutons, multi-touch, performances
- [ ] PWA : manifeste + icône, jouable en plein écran depuis l'écran d'accueil, hors connexion
- [ ] Message « tourne la tablette » en portrait
- [ ] Sélection de niveau / carte du monde

## v1.0 — 12 niveaux

Voir docs/GAME_DESIGN.md (4 mondes × 3 niveaux, un boss par monde, nouvelles morts à chaque niveau).
