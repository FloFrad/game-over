// Catalogue des morts : chacune débloque une case de l'album.
// Ajouter ici les morts des nouveaux niveaux (id unique, numéro global).
// Chaque mort a aussi sa case de BD : ajouter une entrée dans ARTS (src/ui/deathPanel.ts).

export type DeathId =
  // Monde 1 : forêt des Gloumpfs
  | 'colle' | 'plongeon' | 'banane' | 'bonk' | 'enclume' | 'oiseau' | 'ronchon'
  | 'abeilles' | 'champignon' | 'liane' | 'maman'
  // Monde 2 : marais gluant
  | 'escargot' | 'sables' | 'nenuphar' | 'grenouille' | 'moustique' | 'crapouille'
  // Monde 3 : château glacé
  | 'glissade' | 'stalactite' | 'neige' | 'armure' | 'poele' | 'porte' | 'floc'
  // Monde 4 : volcan
  | 'lave' | 'dragon' | 'boomerang' | 'pont' | 'coffre' | 'massue' | 'sauvetage';

export interface Death {
  id: DeathId;
  n: number;
  level: number;
  name: string;
  /** Onomatopée affichée en gros au moment de la mort. */
  sfx: string;
  color: string;
  /** Petite phrase drôle + indice pour ne pas recommencer. */
  txt: string;
}

export const DEATHS: Death[] = [
  // ---- Monde 1 : forêt des Gloumpfs
  { id: 'colle', n: 1, level: 1, name: 'Le câlin collant', sfx: 'SCHLOURP !', color: '#C2389A', txt: 'Les Gloumpfs adorent les câlins. Toi, un peu moins. Saute-leur sur la tête !' },
  { id: 'plongeon', n: 2, level: 1, name: 'Le grand plongeon', sfx: 'AAAAH… PLOC', color: '#3E7DD8', txt: 'Il fallait sauter. Juste un tout petit peu plus loin.' },
  { id: 'banane', n: 3, level: 1, name: 'La peau de banane', sfx: 'ZIOUUU !', color: '#C99400', txt: 'Qui laisse traîner ses épluchures en pleine forêt ?' },
  { id: 'bonk', n: 4, level: 1, name: 'Le plafond trop bas', sfx: 'BONK !', color: '#E63B2E', txt: 'Géant + saut + plafond = énorme bosse. Dans le tunnel, on marche !' },
  { id: 'enclume', n: 5, level: 1, name: "L'enclume du destin", sfx: 'CLONG !', color: '#4A4F5A', txt: "Quand une ombre grossit par terre, on regarde en l'air !" },
  { id: 'oiseau', n: 6, level: 1, name: "L'oiseau affamé", sfx: 'MIAM !', color: '#5B3FA0', txt: "Voler trop haut, c'est finir au goûter d'un oiseau." },
  { id: 'ronchon', n: 7, level: 1, name: 'Le réveil du Ronchon', sfx: 'ATCHOUM !', color: '#4F6582', txt: 'Ne jamais réveiller un troll qui fait la sieste. Passe par-dessus !' },
  { id: 'abeilles', n: 8, level: 2, name: 'La ruche dérangée', sfx: 'BZZZ… AÏE !', color: '#C99400', txt: 'Quand la ruche tremble, les abeilles arrivent. Cours plus vite qu’elles !' },
  { id: 'champignon', n: 9, level: 2, name: 'Le champignon trop rebondissant', sfx: 'BOOOING !', color: '#E63B2E', txt: 'Le champignon rose à tête de rigolo rebondit TROP fort. Rebondis sur le rouge, pas sur le rose !' },
  { id: 'liane', n: 10, level: 2, name: 'La liane qui casse', sfx: 'CRAC… PLOUF !', color: '#4FA33A', txt: 'Un pont de lianes ne tient pas longtemps. Ne t’arrête pas dessus !' },
  { id: 'maman', n: 11, level: 3, name: 'Le gros câlin de Maman Gloumpf', sfx: 'SCHLOUUURP !', color: '#C2389A', txt: 'Maman Gloumpf est très câline. Saute-lui sur la tête, trois fois !' },
  // ---- Monde 2 : marais gluant
  { id: 'escargot', n: 12, level: 4, name: "L'escargot écraseur", sfx: 'SPLATCH !', color: '#7A5A8C', txt: 'Quand on est tout petit, même un escargot devient énorme. Saute dessus avant !' },
  { id: 'sables', n: 13, level: 4, name: 'Les sables mouvants', sfx: 'GLOUP !', color: '#B58A2E', txt: 'Dans les sables mouvants, il faut sauter, sauter, sauter pour en sortir !' },
  { id: 'nenuphar', n: 14, level: 5, name: 'Le nénuphar qui coule', sfx: 'BLOUP !', color: '#2BB3A3', txt: 'Un nénuphar flotte… mais pas longtemps avec un chevalier dessus. Saute vite !' },
  { id: 'grenouille', n: 15, level: 5, name: 'La grenouille gourmande', sfx: 'SLURP !', color: '#4FA33A', txt: 'Quand sa gorge gonfle, la langue arrive. Saute par-dessus !' },
  { id: 'moustique', n: 16, level: 6, name: 'Le moustique géant', sfx: 'PIIIK !', color: '#C23B3B', txt: 'Ce moustique est gros comme un chat. Saute-lui dessus ou donne-lui un coup d’épée !' },
  { id: 'crapouille', n: 17, level: 6, name: 'Crapouille s’assoit dessus', sfx: 'BOUM… SPLOTCH !', color: '#3F7A4A', txt: 'Crapouille saute très haut et retombe très fort. Sors de son ombre !' },
  // ---- Monde 3 : château glacé
  { id: 'glissade', n: 18, level: 7, name: 'La glissade sans fin', sfx: 'WIIIIIII !', color: '#3E9AD8', txt: 'Sur la glace, on ne s’arrête plus. Saute avant le bord !' },
  { id: 'stalactite', n: 19, level: 7, name: 'La stalactite', sfx: 'CLING !', color: '#5BA8D8', txt: 'Quand le plafond tremble, ne reste pas dessous !' },
  { id: 'neige', n: 20, level: 8, name: 'Le bonhomme de neige qui éternue', sfx: 'ATCHA… FLOUF !', color: '#4A7FB0', txt: 'Quand il gonfle, il va éternuer. Saute par-dessus la boule de neige !' },
  { id: 'armure', n: 21, level: 8, name: "L'armure qui se réveille", sfx: 'CLANG !', color: '#6B7C92', txt: 'Cette armure n’est pas vide. Ne la réveille pas… ou saute-lui sur la tête !' },
  { id: 'poele', n: 22, level: 8, name: 'La poêle à frire', sfx: 'BONG !', color: '#4A4F5A', txt: 'La poêle renvoie les boules de neige… et parfois elles reviennent !' },
  { id: 'porte', n: 23, level: 9, name: 'La porte qui a faim', sfx: 'CROUNCH !', color: '#8A5A2B', txt: 'Une porte qui a des dents ? Ne l’ouvre pas !' },
  { id: 'floc', n: 24, level: 9, name: 'Gros Floc éternue', sfx: 'FLOUUUF !', color: '#7EC8F0', txt: 'Gros Floc lance des boules de neige. Renvoie-les-lui avec la poêle !' },
  // ---- Monde 4 : volcan
  { id: 'lave', n: 25, level: 10, name: 'Le bain de lave', sfx: 'PSCHHHT !', color: '#E8601C', txt: 'La lave, c’est chaud. Très chaud. Ne la touche pas !' },
  { id: 'dragon', n: 26, level: 10, name: 'Le dragon qui éternue', sfx: 'ATCHAAA !', color: '#E63B2E', txt: 'Quand le dragon renifle, saute par-dessus sa boule de feu !' },
  { id: 'boomerang', n: 27, level: 11, name: 'Le boomerang qui revient', sfx: 'TOC !', color: '#C99400', txt: 'Un boomerang, ça revient. Attrape-le en restant au sol !' },
  { id: 'pont', n: 28, level: 11, name: 'Le pont qui s’effondre', sfx: 'CRAAAAC !', color: '#8A7352', txt: 'Ce pont de pierre ne tient pas : cours sans t’arrêter !' },
  { id: 'coffre', n: 29, level: 11, name: 'Le coffre qui mord', sfx: 'CHOMP !', color: '#C98B4E', txt: 'Un coffre qui bouge tout seul ? C’est un piège à dents !' },
  { id: 'massue', n: 30, level: 12, name: 'La massue du Ronchon', sfx: 'BOUM !', color: '#4F6582', txt: 'Quand il lève sa massue, saute par-dessus les cailloux !' },
  { id: 'sauvetage', n: 31, level: 12, name: 'Le sauvetage raté', sfx: 'CLIC… AAAAH !', color: '#C2389A', txt: 'La princesse a appuyé sur le mauvais bouton. Comme d’habitude.' },
];

export const DEATH_BY_ID: Record<DeathId, Death> = Object.fromEntries(DEATHS.map((d) => [d.id, d])) as Record<DeathId, Death>;
