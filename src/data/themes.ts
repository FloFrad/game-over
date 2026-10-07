// Thèmes visuels des 4 mondes : couleurs du sol, du ciel, des collines… (textures dans gfx/textures.ts).

export type ThemeId = 'forest' | 'swamp' | 'castle' | 'volcano';

export interface Theme {
  id: ThemeId;
  /** Couleur du ciel (CSS). */
  sky: string;
  dirt: number;
  dirtDark: number;
  /** Couleur de la bande du dessus du sol (herbe, mousse, neige, braise). */
  top: number;
  topKind: 'grass' | 'moss' | 'snow' | 'ember';
  hillsFar: number;
  hillsNear: number;
  /** Teinte des nuages (0xffffff = aucune). */
  cloudTint: number;
  /** Texture du décor : deux variantes, alternées le long du niveau. */
  decor: [string, string];
  /** Couleur de l'eau (les trous « ~ »). */
  water: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  forest: { id: 'forest', sky: '#7EC8F0', dirt: 0xa8693a, dirtDark: 0x8c5530, top: 0x6cc04a, topKind: 'grass', hillsFar: 0xa9ddb0, hillsNear: 0x86c977, cloudTint: 0xffffff, decor: ['tree', 'tree2'], water: 0x3e7dd8 },
  swamp: { id: 'swamp', sky: '#C7DCA2', dirt: 0x6b5a3a, dirtDark: 0x4f432c, top: 0x5a8a3e, topKind: 'moss', hillsFar: 0xa8c08a, hillsNear: 0x6f8f5a, cloudTint: 0xdfe9c4, decor: ['deadtree', 'reeds'], water: 0x4f7a56 },
  castle: { id: 'castle', sky: '#CFE3F5', dirt: 0x8e9ba8, dirtDark: 0x76828f, top: 0xffffff, topKind: 'snow', hillsFar: 0xeef5fb, hillsNear: 0xc4d8ea, cloudTint: 0xffffff, decor: ['pine', 'crystal'], water: 0x7eb6e8 },
  volcano: { id: 'volcano', sky: '#6B2D3A', dirt: 0x4a3a40, dirtDark: 0x33272d, top: 0x2a2024, topKind: 'ember', hillsFar: 0x7d3b44, hillsNear: 0x4a2a34, cloudTint: 0x8a5a66, decor: ['spire', 'charred'], water: 0xe8601c },
};

export const THEME_LIST: Theme[] = Object.values(THEMES);
