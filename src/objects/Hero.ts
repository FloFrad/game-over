// Messire Paulochon : déplacement, saut (coyote time + mémoire du saut + saut court), mode Géant.

import Phaser from 'phaser';
import { PHYSICS, SPRITE_RES } from '../config';
import type { ControlState } from '../systems/Controls';

const BASE_SCALE = 1 / SPRITE_RES;
const GIANT_SCALE = 2 / SPRITE_RES;
// Boîte de collision dans le repère de la texture (rasterisée à 2×).
const BODY_W = 60;
const BODY_H = 104;
const BODY_OFFSET_X = 14; // le corps n'est pas centré : le manche de la casserole dépasse à droite
const BODY_OFFSET_Y = 24;

const approach = (v: number, target: number, delta: number) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));

export class Hero extends Phaser.Physics.Arcade.Sprite {
  face: 1 | -1 = 1;
  speed: number;
  giantTime = 0;
  private coyote = 0;
  private jumpBuf = 0;
  private walkT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number) {
    super(scene, x, y, 'hero');
    this.speed = speed;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setScale(BASE_SCALE).setDepth(20);
    this.arcade.setSize(BODY_W, BODY_H).setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);
    this.arcade.setMaxVelocity(1000, PHYSICS.maxFall);
    this.setCollideWorldBounds(true);
  }

  get arcade(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get isGiant(): boolean {
    return this.giantTime > 0;
  }

  get onGround(): boolean {
    return this.arcade.blocked.down || this.arcade.touching.down;
  }

  makeGiant(duration: number): void {
    this.giantTime = duration;
    this.setScale(GIANT_SCALE);
  }

  /** À appeler à chaque image. `dt` en secondes. Émet 'jump' et 'shrink'. */
  step(dt: number, c: ControlState): void {
    const b = this.arcade;
    const grounded = this.onGround;

    if (this.giantTime > 0) {
      this.giantTime -= dt;
      if (this.giantTime <= 0) {
        this.giantTime = 0;
        this.setScale(BASE_SCALE);
        this.emit('shrink');
      }
    }

    // Course
    const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    const target = dir * this.speed * (this.isGiant ? 1.05 : 1);
    b.setVelocityX(approach(b.velocity.x, target, (grounded ? 2600 : 1800) * dt));
    if (dir !== 0 && dir !== this.face) {
      this.face = dir as 1 | -1;
      this.setFlipX(this.face < 0);
      b.setOffset(this.face < 0 ? this.width - BODY_W - BODY_OFFSET_X : BODY_OFFSET_X, BODY_OFFSET_Y);
    }

    // Saut
    this.coyote = grounded ? PHYSICS.coyoteTime : this.coyote - dt;
    this.jumpBuf = c.jumpPressed ? PHYSICS.jumpBuffer : this.jumpBuf - dt;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      b.setVelocityY(-PHYSICS.jumpVelocity);
      this.jumpBuf = 0;
      this.coyote = 0;
      this.emit('jump');
    }
    if (!c.jump && b.velocity.y < -PHYSICS.jumpCutVelocity) b.setVelocityY(-PHYSICS.jumpCutVelocity);

    // Petit dandinement en marchant, penché en l'air
    if (grounded && Math.abs(b.velocity.x) > 20) {
      this.walkT += dt;
      this.setAngle(Math.sin(this.walkT * 14) * 4);
    } else if (!grounded) {
      this.setAngle((b.velocity.y < 0 ? -3 : 3) * this.face);
    } else {
      this.setAngle(0);
    }
  }

  bounce(): void {
    this.arcade.setVelocityY(-PHYSICS.stompBounce);
  }
}
