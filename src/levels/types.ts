// Format des niveaux : une carte ASCII lisible, facile à éditer à la main.
//
// Légende (une case = TILE px) :
//   .  vide
//   Cases (solides ou zones) :
//   #  sol / roche (solide, dessus décoré selon le thème : herbe, mousse, neige, braise)
//   I  glace (solide et glissante)
//   =  planche (plateforme traversable par en dessous)
//   C  caisse (solide, cassée par le héros en mode Géant)
//   ~  eau (décor, sous un pont ; tomber dedans = plongeon)
//   L  lave (mortelle au toucher)
//   Q  sables mouvants (on s'enfonce ; sauter pour se dégager)
//   Entités (posées sur la carte, pas des cases) :
//   @  départ du héros              K  drapeau de sauvegarde        Z  princesse = fin du niveau
//   G  Gloumpf (à écraser)          g  grenouille                    s  escargot
//   m  moustique géant              O  bonhomme de neige lanceur     a  armure qui se réveille
//   d  dragon qui éternue           c  coffre qui mord               D  porte qui est une bouche
//   H  ruche (les abeilles)         T  stalactite (sous un plafond)  A  déclencheur d'enclume
//   R  Ronchon endormi (bord gauche)
//   S  épée   P  potion Géante   F  potion Plume   U  potion Minus   X  potion Fantôme
//   J  poêle à frire   V  boomerang   B  peau de banane
//   M  champignon rebondissant   W  champignon sauvage (rebondit TROP fort)
//   f  pont de lianes / dalle qui s'effondre   r  planche pourrie (tombe tout de suite)   n  nénuphar (coule)
//   [  porte d'entrée de l'arène (se ferme)   ]  porte de sortie (s'ouvre à la mort du boss)
//   1 2 3 4  boss du monde (Maman Gloumpf, Crapouille, Gros Floc, Ronchon)

import type { ThemeId } from '../data/themes';

export interface LevelData {
  id: number;
  name: string;
  world: string;
  theme: ThemeId;
  /** Colonnes où planter un élément de décor (arbres, roseaux, sapins…). */
  decor: number[];
  /** Ce que dit la princesse en voyant arriver le héros, puis à l'arrivée (facultatif). */
  greeting?: string;
  thanks?: string;
  map: string[];
}

export type Tile = 0 | 1 | 2 | 3 | 4;
export const TILE_EMPTY: Tile = 0;
export const TILE_GROUND: Tile = 1;
export const TILE_PLANK: Tile = 2;
export const TILE_CRATE: Tile = 3;
export const TILE_ICE: Tile = 4;

export interface LevelEntity {
  type: string;
  col: number;
  row: number;
}

export interface ParsedLevel {
  data: LevelData;
  cols: number;
  rows: number;
  grid: Tile[][];
  water: { col: number; row: number }[];
  lava: { col: number; row: number }[];
  sand: { col: number; row: number }[];
  entities: LevelEntity[];
}

export function parseLevel(data: LevelData): ParsedLevel {
  const rows = data.map.length;
  const cols = Math.max(...data.map.map((r) => r.length));
  const grid: Tile[][] = [];
  const water: { col: number; row: number }[] = [];
  const lava: { col: number; row: number }[] = [];
  const sand: { col: number; row: number }[] = [];
  const entities: LevelEntity[] = [];

  for (let r = 0; r < rows; r++) {
    const line: Tile[] = [];
    for (let c = 0; c < cols; c++) {
      const ch = data.map[r][c] ?? '.';
      switch (ch) {
        case '#': line.push(TILE_GROUND); break;
        case '=': line.push(TILE_PLANK); break;
        case 'C': line.push(TILE_CRATE); break;
        case 'I': line.push(TILE_ICE); break;
        case '~': line.push(TILE_EMPTY); water.push({ col: c, row: r }); break;
        case 'L': line.push(TILE_EMPTY); lava.push({ col: c, row: r }); break;
        case 'Q': line.push(TILE_EMPTY); sand.push({ col: c, row: r }); break;
        case '.': line.push(TILE_EMPTY); break;
        default: line.push(TILE_EMPTY); entities.push({ type: ch, col: c, row: r });
      }
    }
    grid.push(line);
  }
  return { data, cols, rows, grid, water, lava, sand, entities };
}
