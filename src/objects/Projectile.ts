// Projectiles : boule de neige, boule de feu, gelée, cailloux de la massue.
// Une boule de neige / de feu peut être renvoyée à la poêle : elle repart vers le tireur… et s'il n'est
// pas là, elle revient (rebond) et frappe le héros : mort « la poêle à frire ».

import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { DeathId } from '../data/deaths';
import { overlaps, rectOf, type Ctx, type Rect } from './hazard';

export interface ProjectileOptions {
  vy?: number;
  /** Gravité (px/s²) : 0 = trajectoire droite. */
  ay?: number;
  /** Se pose et disparaît en touchant le sol (gelée lancée). */
  landOnGround?: boolean;
  /** Peut être renvoyé avec la poêle. */
  reflectable?: boolean;
  /** Rayon de la zone qui blesse. */
  r?: number;
  /** Cailloux d'onde de choc : glissent au ras du sol sans disparaître sur les marches. */
  ground?: boolean;
  /** Texte d'impact. */
  spin?: number;
}

export class Projectile {
  readonly img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  dead = false;
  hostile = true;
  reflected = false;
  private ay: number;
  private r: number;
  private traveled = 0;
  private spin: number;

  constructor(
    scene: Phaser.Scene,
    tex: string,
    x: number,
    y: number,
    vx: number,
    private death: DeathId,
    private opts: ProjectileOptions = {},
  ) {
    this.vx = vx;
    this.vy = opts.vy ?? 0;
    this.ay = opts.ay ?? 0;
    this.r = opts.r ?? 15;
    this.spin = opts.spin ?? Math.sign(vx || 1) * 6;
    this.img = scene.add.image(x, y, tex).setDepth(18);
  }

  get x(): number {
    return this.img.x;
  }

  get y(): number {
    return this.img.y;
  }

  get rect(): Rect {
    return rectOf(this.img.x - this.r, this.img.y - this.r, this.r * 2, this.r * 2);
  }

  /** Renvoyée par la poêle : repart dans l'autre sens, ne blesse plus le héros (tant qu'elle ne rebondit pas). */
  private reflect(c: Ctx): void {
    this.vx = -this.vx * 1.15;
    this.hostile = false;
    this.reflected = true;
    this.traveled = 0;
    this.death = 'poele';
    c.sfx('bong');
    c.say(this.img.x, this.img.y - 40, 'BONG !', { size: 34, color: '#FFFFFF' });
  }

  /** Elle a rebondi : elle revient sur le héros. */
  private ricochet(c: Ctx): void {
    this.vx = -this.vx;
    this.hostile = true;
    this.reflected = false;
    this.traveled = 0;
    c.sfx('whoosh');
  }

  private destroy(): void {
    this.dead = true;
    this.img.destroy();
  }

  /** Renvoie la mort provoquée, ou null. */
  step(dt: number, c: Ctx): DeathId | null {
    if (this.dead) return null;
    const img = this.img;
    this.vy += this.ay * dt;
    img.x += this.vx * dt;
    img.y += this.vy * dt;
    img.rotation += this.spin * dt;
    this.traveled += Math.abs(this.vx * dt);

    if (this.hostile) {
      if (overlaps(c.heroRect, this.rect)) {
        this.destroy();
        return this.death;
      }
      if (this.opts.reflectable && c.pan && overlaps(c.pan, this.rect)) this.reflect(c);
    } else {
      // renvoyée : touche-t-elle un monstre ?
      for (const t of c.targets) {
        if (t.canBeHurt() && overlaps(t.rect, this.rect)) {
          t.hurt(c);
          c.burst(img.x, img.y, 6, 0xffffff, true);
          this.destroy();
          return null;
        }
      }
    }

    if (this.opts.landOnGround && img.y >= c.groundY - this.r) {
      c.burst(img.x, c.groundY - 6, 5, 0xc2389a, true, 120);
      this.destroy();
      return null;
    }
    const hitWall = !this.opts.ground && c.isSolidAt(img.x + Math.sign(this.vx) * this.r, img.y);
    const far = img.x < c.scrollX - 120 || img.x > c.scrollX + GAME_WIDTH + 120 || this.traveled > 900;
    if (hitWall || far) {
      if (this.reflected) this.ricochet(c);
      else this.destroy();
    }
    return null;
  }
}
