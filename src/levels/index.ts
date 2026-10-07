// Registre des niveaux jouables : numéro → carte. Ajouter un niveau = l'importer ici
// (et le placer dans un monde de data/worlds.ts s'il n'y est pas déjà).

import { LEVEL_1 } from './level1';
import type { LevelData } from './types';

export const LEVELS: Record<number, LevelData> = {
  1: LEVEL_1,
};
