// Format des niveaux : une carte ASCII lisible, facile à éditer à la main.
//
// Légende (une case = TILE px) :
//   .  vide
//   #  sol / roche (solide, herbe ajoutée automatiquement sur le dessus)
//   =  planche (plateforme traversable par en dessous)
//   C  caisse (solide, cassée par le héros en mode Géant)
//   ~  eau (décor, sous un pont)
//   @  départ du héros (sur la case au-dessus du sol)
//   K  drapeau de sauvegarde
//   G  Gloumpf (patrouille, à écraser en sautant dessus)
//   S  épée en bois                         [à coder]
//   P  potion Géante
//   F  potion Plume (vol)                   [à coder]
//   B  peau de banane                       [à coder]
//   A  déclencheur d'enclume (colonne)      [à coder]
//   R  Ronchon endormi (bord gauche)        [à coder]
//   Z  princesse Mimicracra = fin du niveau

export interface LevelData {
  id: number;
  name: string;
  world: string;
  /** Colonnes où planter un arbre de décor. */
  trees: number[];
  map: string[];
}

export type Tile = 0 | 1 | 2 | 3;
export const TILE_EMPTY: Tile = 0;
export const TILE_GROUND: Tile = 1;
export const TILE_PLANK: Tile = 2;
export const TILE_CRATE: Tile = 3;

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
  entities: LevelEntity[];
}

export function parseLevel(data: LevelData): ParsedLevel {
  const rows = data.map.length;
  const cols = Math.max(...data.map.map((r) => r.length));
  const grid: Tile[][] = [];
  const water: { col: number; row: number }[] = [];
  const entities: LevelEntity[] = [];

  for (let r = 0; r < rows; r++) {
    const line: Tile[] = [];
    for (let c = 0; c < cols; c++) {
      const ch = data.map[r][c] ?? '.';
      switch (ch) {
        case '#': line.push(TILE_GROUND); break;
        case '=': line.push(TILE_PLANK); break;
        case 'C': line.push(TILE_CRATE); break;
        case '~': line.push(TILE_EMPTY); water.push({ col: c, row: r }); break;
        case '.': line.push(TILE_EMPTY); break;
        default: line.push(TILE_EMPTY); entities.push({ type: ch, col: c, row: r });
      }
    }
    grid.push(line);
  }
  return { data, cols, rows, grid, water, entities };
}
