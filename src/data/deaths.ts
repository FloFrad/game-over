// Catalogue des morts : chacune débloque une case de l'album.
// Ajouter ici les morts des nouveaux niveaux (id unique, numéro global).
// Chaque mort a aussi sa case de BD : ajouter une entrée dans ARTS (src/ui/deathPanel.ts).

export type DeathId = 'colle' | 'plongeon' | 'banane' | 'bonk' | 'enclume' | 'oiseau' | 'ronchon';

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
  { id: 'colle', n: 1, level: 1, name: 'Le câlin collant', sfx: 'SCHLOURP !', color: '#C2389A', txt: 'Les Gloumpfs adorent les câlins. Toi, un peu moins. Saute-leur sur la tête !' },
  { id: 'plongeon', n: 2, level: 1, name: 'Le grand plongeon', sfx: 'AAAAH… PLOC', color: '#3E7DD8', txt: 'Il fallait sauter. Juste un tout petit peu plus loin.' },
  { id: 'banane', n: 3, level: 1, name: 'La peau de banane', sfx: 'ZIOUUU !', color: '#C99400', txt: 'Qui laisse traîner ses épluchures en pleine forêt ?' },
  { id: 'bonk', n: 4, level: 1, name: 'Le plafond trop bas', sfx: 'BONK !', color: '#E63B2E', txt: 'Géant + saut + plafond = énorme bosse. Dans le tunnel, on marche !' },
  { id: 'enclume', n: 5, level: 1, name: "L'enclume du destin", sfx: 'CLONG !', color: '#4A4F5A', txt: "Quand une ombre grossit par terre, on regarde en l'air !" },
  { id: 'oiseau', n: 6, level: 1, name: "L'oiseau affamé", sfx: 'MIAM !', color: '#5B3FA0', txt: "Voler trop haut, c'est finir au goûter d'un oiseau." },
  { id: 'ronchon', n: 7, level: 1, name: 'Le réveil du Ronchon', sfx: 'ATCHOUM !', color: '#4F6582', txt: 'Ne jamais réveiller un troll qui fait la sieste. Passe par-dessus !' },
];

export const DEATH_BY_ID: Record<DeathId, Death> = Object.fromEntries(DEATHS.map((d) => [d.id, d])) as Record<DeathId, Death>;
