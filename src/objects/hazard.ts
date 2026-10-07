// Socle commun des pièges et monstres des niveaux 2 à 12 : un `Hazard` est mis à jour à chaque image
// et renvoie l'id de la mort qu'il provoque (ou null). Le LevelScene lui passe un `Ctx` avec tout ce qu'il faut savoir.

import Phaser from 'phaser';
import type { ModeSettings } from '../config';
import type { DeathId } from '../data/deaths';
import type { SfxKind } from '../systems/sound';
import type { ControlState } from '../systems/Controls';
import type { ComicTextOptions } from '../ui/comicText';
import type { Hero } from './Hero';
import type { Projectile } from './Projectile';

export type Rect = Phaser.Geom.Rectangle;
export const overlaps = Phaser.Geom.Rectangle.Overlaps;

/** Ce que le joueur peut toucher avec un projectile renvoyé (monstres tireurs, boss). */
export interface Target {
  rect: Rect;
  canBeHurt(): boolean;
  hurt(c: Ctx): void;
}

export interface Ctx {
  scene: Phaser.Scene;
  hero: Hero;
  controls: ControlState;
  mode: ModeSettings;
  groundY: number;
  /** Temps de jeu en secondes. */
  t: number;
  scrollX: number;
  heroRect: Rect;
  /** Les monstres ne voient pas un héros fantôme. */
  seen: boolean;
  /** Zones qui font mal aux monstres ce tour-ci : coup d'épée / de poêle, boomerang en vol. */
  attacks: Rect[];
  /** Le boomerang en vol (les boss ne craignent que lui). */
  boomerang: Rect | null;
  /** Zone de la poêle pendant un coup (renvoie les projectiles). */
  pan: Rect | null;
  projectiles: Projectile[];
  targets: Target[];
  isSolidAt(x: number, y: number): boolean;
  say(x: number, y: number, text: string, opts?: ComicTextOptions): void;
  burst(x: number, y: number, n: number, color: number, round?: boolean, spread?: number): void;
  sfx(kind: SfxKind, arg?: number): void;
  shake(ms: number, intensity: number): void;
}

export interface Hazard {
  /** Renvoie la mort provoquée ce tour-ci, sinon null. */
  step(dt: number, c: Ctx): DeathId | null;
}

/** Vrai si le héros retombe sur le dessus d'un monstre dont le haut est à `top` (= écrasement). */
export function stomping(hero: Hero, top: number): boolean {
  const b = hero.arcade;
  return b.velocity.y > 0 && b.prev.y + b.height <= top + 14;
}

export const rectOf = (x: number, y: number, w: number, h: number): Rect => new Phaser.Geom.Rectangle(x, y, w, h);
