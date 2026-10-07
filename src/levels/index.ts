// Registre des niveaux jouables : numéro → carte. Ajouter un niveau = l'importer ici
// (et le placer dans un monde de data/worlds.ts s'il n'y est pas déjà).

import { LEVEL_1 } from './level1';
import { LEVEL_2 } from './level2';
import { LEVEL_3 } from './level3';
import { LEVEL_4 } from './level4';
import { LEVEL_5 } from './level5';
import { LEVEL_6 } from './level6';
import { LEVEL_7 } from './level7';
import { LEVEL_8 } from './level8';
import { LEVEL_9 } from './level9';
import { LEVEL_10 } from './level10';
import { LEVEL_11 } from './level11';
import { LEVEL_12 } from './level12';
import type { LevelData } from './types';

export const LEVELS: Record<number, LevelData> = {
  1: LEVEL_1,
  2: LEVEL_2,
  3: LEVEL_3,
  4: LEVEL_4,
  5: LEVEL_5,
  6: LEVEL_6,
  7: LEVEL_7,
  8: LEVEL_8,
  9: LEVEL_9,
  10: LEVEL_10,
  11: LEVEL_11,
  12: LEVEL_12,
};
