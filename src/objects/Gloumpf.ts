// Gloumpf : petit monstre gluant qui patrouille et fait demi-tour aux murs et au bord du vide.

import Phaser from 'phaser';
import { SPRITE_RES } from '../config';

export type GroundProbe = (x: number, y: number) => boolean;

export class Gloumpf extends Phaser.Physics.Arcade.Sprite {
  dir: 1 | -1 = -1;
  alive = true;
  private wobble = Math.random() * 6;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private speed: number,
    private isSolidAt: GroundProbe,
  ) {
    super(scene, x, y, 'gloumpf');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setScale(1 / SPRITE_RES).setDepth(15);
    this.arcade.setSize(76, 76).setOffset(9, 18);
  }

  get arcade(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  step(dt: number): void {
    if (!this.alive) return;
    const b = this.arcade;
    if (b.blocked.left) this.dir = 1;
    if (b.blocked.right) this.dir = -1;
    if (b.blocked.down) {
      const aheadX = this.dir > 0 ? b.right + 2 : b.left - 2;
      if (!this.isSolidAt(aheadX, b.bottom + 4)) this.dir = this.dir > 0 ? -1 : 1;
    }
    b.setVelocityX(this.dir * this.speed);
    this.setFlipX(this.dir < 0);
    this.wobble += dt;
    const s = 1 / SPRITE_RES;
    this.setScale(s * (1 - Math.sin(this.wobble * 10) * 0.05), s * (1 + Math.sin(this.wobble * 10) * 0.05));
  }

  squash(): void {
    this.alive = false;
    this.arcade.enable = false;
    this.scene.tweens.add({
      targets: this,
      scaleY: 0.08,
      scaleX: 0.75,
      alpha: 0,
      duration: 450,
      ease: 'Quad.Out',
      onComplete: () => this.destroy(),
    });
  }
}
