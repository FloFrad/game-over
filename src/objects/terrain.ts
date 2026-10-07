// Terrain « vivant » : ponts qui cèdent (lianes, planches pourries, dalles), nénuphars qui coulent,
// champignons rebondissants et sables mouvants.

import Phaser from 'phaser';
import { COLORS, SPRITE_RES, TILE } from '../config';
import type { DeathId } from '../data/deaths';
import { overlaps, rectOf, stomping, type Ctx, type Hazard } from './hazard';

const S = 1 / SPRITE_RES;

/** Un morceau de pont (planche traversable par en dessous) qui tombe peu après qu'on a marché dessus. */
export class Fragile implements Hazard {
  private img: Phaser.Physics.Arcade.Image;
  private state: 'ok' | 'armed' | 'gone' = 'ok';
  private timer = 0;

  constructor(
    group: Phaser.Physics.Arcade.StaticGroup,
    private col: number,
    private row: number,
    texture: string,
    private delay: number,
    private death: DeathId,
    private onStand: (death: DeathId) => void,
  ) {
    this.img = group.create(col * TILE + TILE / 2, row * TILE + 9, texture) as Phaser.Physics.Arcade.Image;
    this.img.setDepth(3);
    const b = this.img.body as Phaser.Physics.Arcade.StaticBody;
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
  }

  step(dt: number, c: Ctx): DeathId | null {
    if (this.state === 'gone') return null;
    const hb = c.hero.arcade;
    const top = this.row * TILE;
    const onIt = c.hero.onGround && hb.right > this.col * TILE && hb.left < (this.col + 1) * TILE && Math.abs(hb.bottom - top) < 8;
    if (onIt) this.onStand(this.death);
    if (this.state === 'ok' && onIt) {
      this.state = 'armed';
      this.timer = this.delay;
      c.sfx('crack');
    }
    if (this.state === 'armed') {
      this.img.x = this.col * TILE + TILE / 2 + Math.sin(c.t * 70) * 2;
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'gone';
        (this.img.body as Phaser.Physics.Arcade.StaticBody).enable = false;
        c.scene.tweens.add({ targets: this.img, y: this.img.y + 320, angle: 40, alpha: 0, duration: 700, ease: 'Quad.In', onComplete: () => this.img.destroy() });
        c.burst(this.img.x, this.img.y, 4, COLORS.wood, false, 80);
      }
    }
    return null;
  }
}

/** Nénuphar : tient une seconde puis coule, et revient. */
export class Lily implements Hazard {
  private img: Phaser.Physics.Arcade.Image;
  private state: 'up' | 'armed' | 'down' = 'up';
  private timer = 0;
  private y0: number;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.StaticGroup, private col: number, row: number, private onStand: (death: DeathId) => void) {
    this.y0 = row * TILE + 20;
    this.img = group.create(col * TILE + TILE / 2, this.y0, 'lily') as Phaser.Physics.Arcade.Image;
    this.img.setDepth(3);
    const b = this.img.body as Phaser.Physics.Arcade.StaticBody;
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    scene.tweens.add({ targets: this.img, angle: { from: -2, to: 2 }, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' });
  }

  private setSolid(on: boolean): void {
    const b = this.img.body as Phaser.Physics.Arcade.StaticBody;
    b.enable = on;
    if (on) b.updateFromGameObject();
  }

  step(dt: number, c: Ctx): DeathId | null {
    const hb = c.hero.arcade;
    const onIt = this.state !== 'down' && c.hero.onGround && hb.right > this.col * TILE && hb.left < (this.col + 1) * TILE && Math.abs(hb.bottom - (this.y0 - 6)) < 10;
    if (this.state === 'up' && onIt) {
      this.state = 'armed';
      this.timer = 1.1;
    } else if (this.state === 'armed') {
      this.img.y = this.y0 + (1 - this.timer) * 4 + Math.sin(c.t * 30) * 1.5; // il s'enfonce doucement : indice
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'down';
        this.timer = 3;
        this.setSolid(false);
        if (onIt) this.onStand('nenuphar'); // tombé avec le nénuphar : mort « BLOUP ! »
        c.sfx('splash');
        c.say(this.img.x, this.y0 - 40, 'BLOUP !', { size: 34, color: '#FFFFFF' });
        c.scene.tweens.add({ targets: this.img, y: this.y0 + 40, alpha: 0, duration: 400 });
      }
    } else if (this.state === 'down') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'up';
        this.img.setPosition(this.col * TILE + TILE / 2, this.y0).setAlpha(1);
        this.img.refreshBody();
        this.setSolid(true);
      }
    }
    return null;
  }
}

/** Champignon : rebondit ; le sauvage (yeux rouges) rebondit TROP fort. */
export class Mushroom implements Hazard {
  private img: Phaser.GameObjects.Image;
  private launched = 0;

  constructor(scene: Phaser.Scene, private x: number, private bottom: number, private wild: boolean) {
    this.img = scene.add.image(x, bottom + 2, wild ? 'mushroomWild' : 'mushroom').setOrigin(0.5, 1).setScale(S).setDepth(15);
    // il se dandine : on a envie de lui sauter dessus
    scene.tweens.add({ targets: this.img, scaleY: S * 0.93, scaleX: S * 1.04, yoyo: true, repeat: -1, duration: 600 + (x % 5) * 40, ease: 'Sine.InOut' });
  }

  step(dt: number, c: Ctx): DeathId | null {
    const hb = c.hero.arcade;
    const h = this.img.displayHeight;
    const pad = rectOf(this.x - 24, this.bottom - h, 48, 22);
    if (overlaps(c.heroRect, pad) && stomping(c.hero, this.bottom - h) && c.hero.flyTime <= 0) {
      c.hero.launch(this.wild ? 1950 : 1100);
      c.sfx('boing');
      c.say(this.x, this.bottom - h - 24, 'BOING !', { size: this.wild ? 46 : 34, color: this.wild ? '#FFFFFF' : undefined });
      this.launched = this.wild ? 3 : 0;
      c.scene.tweens.add({ targets: this.img, scaleY: S * 0.7, scaleX: S * 1.25, yoyo: true, duration: 110 });
    }
    // Lancé trop haut : il sort de l'écran par le haut… et ne revient pas
    if (this.launched > 0) {
      this.launched -= dt;
      if (hb.bottom < -30) return 'champignon';
    }
    return null;
  }
}

/** Sables mouvants : on s'enfonce ; chaque appui sur SAUT donne un coup pour remonter. */
export class Quicksand implements Hazard {
  private warned = false;

  constructor(private x0: number, private x1: number, private top: number) {}

  step(_dt: number, c: Ctx): DeathId | null {
    const b = c.hero.arcade;
    const cx = b.center.x;
    if (cx < this.x0 || cx > this.x1 || b.bottom <= this.top + 1) return null;
    if (c.controls.jumpPressed) {
      b.setVelocityY(-c.mode.swimImpulse);
      c.sfx('splash');
    } else if (b.velocity.y > c.mode.sinkSpeed) {
      b.setVelocityY(c.mode.sinkSpeed);
    }
    b.setVelocityX(b.velocity.x * 0.6);
    c.hero.setAngle(Math.sin(c.t * 9) * 5);
    if (!this.warned) {
      this.warned = true;
      c.say(cx, this.top - 70, 'SAUTE !\nSAUTE !', { size: 34, color: '#FFFFFF', life: 1400 });
    }
    if (b.top > this.top + 6) return 'sables';
    return null;
  }
}
