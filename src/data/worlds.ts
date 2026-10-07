// Les mondes de la carte (docs/GAME_DESIGN.md : 4 mondes × 3 niveaux).
// Un niveau n'est jouable que s'il existe dans levels/index.ts ; les autres affichent un cadenas.

export interface World {
  id: number;
  name: string;
  /** Couleur de la bannière du monde. */
  color: number;
  /** Numéros des niveaux du monde. */
  levels: number[];
}

export const WORLDS: World[] = [
  { id: 1, name: 'FORÊT DES GLOUMPFS', color: 0x6cc04a, levels: [1, 2, 3] },
  { id: 2, name: 'MARAIS GLUANT', color: 0x2bb3a3, levels: [4, 5, 6] },
  { id: 3, name: 'CHÂTEAU GLACÉ', color: 0x7ec8f0, levels: [7, 8, 9] },
  { id: 4, name: 'VOLCAN', color: 0xe63b2e, levels: [10, 11, 12] },
];
