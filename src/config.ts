// Réglages globaux du jeu : dimensions, couleurs, physique, modes de difficulté.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE = 45;

/** Couleurs de la planche de style (voir docs/STYLE_GUIDE.md). */
export const COLORS = {
  ink: 0x1a1a1a,
  paper: 0xfff8e7,
  sky: 0x7ec8f0,
  tomato: 0xe63b2e,
  banana: 0xffd23f,
  lagoon: 0x2bb3a3,
  goo: 0xc2389a,
  grass: 0x6cc04a,
  dirt: 0xa8693a,
  dirtDark: 0x8c5530,
  wood: 0xd49a5e,
  woodDark: 0x8a5a2b,
  crate: 0xc98b4e,
  steel: 0xb8c4cc,
  water: 0x3e7dd8,
  locked: 0xe4ded0,
} as const;

export const CSS = {
  ink: '#1A1A1A',
  paper: '#FFF8E7',
  sky: '#7EC8F0',
  tomato: '#E63B2E',
  banana: '#FFD23F',
  goo: '#C2389A',
  pink: '#FF8FC7',
  muted: '#5A5446',
  night: '#22303F',
} as const;

export const FONT_DISPLAY = 'Bangers, Impact, "Arial Black", sans-serif';
export const FONT_BODY = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive';

export const PHYSICS = {
  gravity: 2000,
  jumpVelocity: 800,
  /** Vitesse verticale max quand on relâche le saut (saut court). */
  jumpCutVelocity: 330,
  maxFall: 900,
  /** Tolérance pour sauter juste après avoir quitté un bord (s). */
  coyoteTime: 0.1,
  /** Un appui sur SAUT juste avant d'atterrir est mémorisé (s). */
  jumpBuffer: 0.13,
  stompBounce: 520,
} as const;

export type Mode = 'petit' | 'grand';

export interface ModeSettings {
  label: string;
  hint: string;
  heroSpeed: number;
  gloumpfSpeed: number;
  /** Temps entre l'apparition de l'ombre et la chute d'une enclume (s). */
  anvilWarn: number;
  giantDuration: number;
  flyDuration: number;
}

/** « Petit chevalier » pour ~5 ans, « Grand chevalier » pour ~10 ans. */
export const MODES: Record<Mode, ModeSettings> = {
  petit: { label: 'PETIT CHEVALIER', hint: 'plus lent, plus facile', heroSpeed: 230, gloumpfSpeed: 45, anvilWarn: 1.5, giantDuration: 13, flyDuration: 10 },
  grand: { label: 'GRAND CHEVALIER', hint: 'plus rapide, plus vicieux', heroSpeed: 265, gloumpfSpeed: 85, anvilWarn: 0.85, giantDuration: 9, flyDuration: 7 },
};

/**
 * Sprites SVG (public/assets/svg). `h` = hauteur affichée en px de jeu.
 * Les SVG sont rasterisés à 2× pour rester nets sur iPad / Retina, puis affichés à l'échelle 0.5.
 */
export const SPRITES = {
  hero: { file: 'hero', h: 66 },
  princess: { file: 'princess', h: 82 },
  gloumpf: { file: 'gloumpf', h: 49 },
  ronchon: { file: 'ronchon-sleeping', h: 200 },
  potionGiant: { file: 'potion-giant', h: 44 },
  potionPlume: { file: 'potion-plume', h: 44 },
  sword: { file: 'sword', h: 44 },
  ghost: { file: 'ghost', h: 78 },
  anvil: { file: 'anvil', h: 56 },
  peel: { file: 'banana-peel', h: 28 },
  bird: { file: 'bird', h: 58 },
  skull: { file: 'skull', h: 60 },
} as const;

export type SpriteKey = keyof typeof SPRITES;
export const SPRITE_RES = 2;

/**
 * Versions « grande case » des sprites, pour les vignettes de BD (src/ui/deathPanel.ts) :
 * rasterisées plus finement (facteur ×N) sous la clé `${nom}Big`, pour rester nettes quand on agrandit.
 */
export const BIG_SPRITES = { hero: 4, gloumpf: 4, anvil: 4, bird: 4, ghost: 4, peel: 4, skull: 4, ronchon: 3 } as const;
export type BigSpriteKey = keyof typeof BIG_SPRITES;
