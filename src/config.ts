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
  tinyDuration: number;
  ghostDuration: number;
  /** Vitesse et cadence des ennemis des mondes 2 à 4 (1 = « Grand chevalier »). */
  foe: number;
  /** Points de vie des boss. */
  bossHp: number;
  /** Boss : 1 = normal, plus petit = plus lent, alertes plus longues, boss sonné plus longtemps. */
  bossCalm: number;
  /** Pause de l'oiseau hors de l'écran entre deux passages (s). */
  birdPause: number;
  /** Sables mouvants : vitesse d'enfoncement (px/s) et force d'un coup de saut pour se dégager. */
  sinkSpeed: number;
  swimImpulse: number;
  /** Le boomerang qui revient : le « Petit chevalier » l'attrape toujours. */
  autoCatch: boolean;
}

/** « Petit chevalier » pour ~5 ans, « Grand chevalier » pour ~10 ans. */
export const MODES: Record<Mode, ModeSettings> = {
  petit: { label: 'PETIT CHEVALIER', hint: 'plus lent, plus facile', heroSpeed: 230, gloumpfSpeed: 45, anvilWarn: 1.5, giantDuration: 13, flyDuration: 10, tinyDuration: 10, ghostDuration: 11, foe: 0.7, bossHp: 2, bossCalm: 0.5, birdPause: 8, sinkSpeed: 24, swimImpulse: 520, autoCatch: true },
  grand: { label: 'GRAND CHEVALIER', hint: 'plus rapide, plus vicieux', heroSpeed: 265, gloumpfSpeed: 85, anvilWarn: 0.85, giantDuration: 9, flyDuration: 7, tinyDuration: 8, ghostDuration: 8, foe: 1, bossHp: 4, bossCalm: 1, birdPause: 4, sinkSpeed: 52, swimImpulse: 430, autoCatch: false },
};

/**
 * Sprites SVG (public/assets/svg). `h` = hauteur affichée en px de jeu.
 * Les SVG sont rasterisés à 2× pour rester nets sur iPad / Retina, puis affichés à l'échelle 0.5.
 */
export const SPRITES = {
  hero: { file: 'hero', h: 66, r: 274 / 330 },
  princess: { file: 'princess', h: 82, r: 268 / 338 },
  gloumpf: { file: 'gloumpf', h: 49, r: 176 / 184 },
  ronchon: { file: 'ronchon-sleeping', h: 200, r: 410 / 258 },
  potionGiant: { file: 'potion-giant', h: 44, r: 140 / 150 },
  potionPlume: { file: 'potion-plume', h: 44, r: 140 / 150 },
  sword: { file: 'sword', h: 44, r: 60 / 184 },
  ghost: { file: 'ghost', h: 78, r: 180 / 182 },
  anvil: { file: 'anvil', h: 56, r: 306 / 144 },
  peel: { file: 'banana-peel', h: 28, r: 80 / 50 },
  bird: { file: 'bird', h: 58, r: 132 / 84 },
  skull: { file: 'skull', h: 60, r: 120 / 130 },
  // Monde 1 : forêt
  beehive: { file: 'beehive', h: 62, r: 90 / 110 },
  bee: { file: 'bee', h: 22, r: 64 / 48 },
  mushroom: { file: 'mushroom', h: 38, r: 80 / 72 },
  mushroomWild: { file: 'mushroom-wild', h: 76, r: 120 / 110 },
  // Monde 2 : marais
  frog: { file: 'frog', h: 44, r: 130 / 96 },
  snail: { file: 'snail', h: 36, r: 104 / 84 },
  mosquito: { file: 'mosquito', h: 34, r: 112 / 84 },
  potionMinus: { file: 'potion-minus', h: 44, r: 140 / 150 },
  potionGhost: { file: 'potion-ghost', h: 44, r: 140 / 150 },
  // Monde 3 : château glacé
  snowman: { file: 'snowman', h: 68, r: 110 / 150 },
  armor: { file: 'armor', h: 86, r: 110 / 184 },
  stalactite: { file: 'stalactite', h: 62, r: 64 / 104 },
  pan: { file: 'pan', h: 40, r: 130 / 60 },
  door: { file: 'door', h: 100, r: 90 / 124 },
  doorMouth: { file: 'door-mouth', h: 100, r: 90 / 124 },
  // Monde 4 : volcan
  dragon: { file: 'dragon', h: 70, r: 150 / 124 },
  chest: { file: 'chest', h: 42, r: 104 / 84 },
  mimic: { file: 'mimic', h: 60, r: 124 / 112 },
  boomerang: { file: 'boomerang', h: 30, r: 92 / 70 },
  ronchonAwake: { file: 'ronchon-awake', h: 200, r: 410 / 258 },
  club: { file: 'club', h: 150, r: 100 / 240 },
} as const;

export type SpriteKey = keyof typeof SPRITES;
export const SPRITE_RES = 2;

/**
 * Versions « grande case » des sprites, pour les vignettes de BD (src/ui/deathPanel.ts) :
 * rasterisées plus finement (facteur ×N) sous la clé `${nom}Big`, pour rester nettes quand on agrandit.
 */
export const BIG_SPRITES = {
  hero: 4, gloumpf: 4, anvil: 4, bird: 4, ghost: 4, peel: 4, skull: 4, ronchon: 3,
  beehive: 4, bee: 4, mushroom: 4, mushroomWild: 3, frog: 4, snail: 4, mosquito: 4,
  snowman: 4, armor: 3, stalactite: 4, pan: 4, door: 3, doorMouth: 3,
  dragon: 4, chest: 4, mimic: 4, boomerang: 4, ronchonAwake: 3, club: 3, princess: 4,
} as const;
export type BigSpriteKey = keyof typeof BIG_SPRITES;
