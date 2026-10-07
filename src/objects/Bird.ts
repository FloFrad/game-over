// Oiseau affamé : patrouille en haut de l'écran tant que le héros vole avec la potion Plume.
// Voler trop haut = il l'attrape (mort « oiseau affamé »). Il repart quand la Plume est finie.

import Phaser from 'phaser';
import { GAME_WIDTH, SPRITE_RES } from '../config';

const MARGIN = 70;

export class Bird {
  readonly image: Phaser.GameObjects.Image;
  active = false;
  private leaving = false;
  /** Position horizontale dans l'écran (la caméra défile, l'oiseau reste dans le cadre). */
  private sx = 0;
  private dir: 1 | -1 = -1;

  constructor(scene: Phaser.Scene) {
    this.image = scene.add.image(0, 40, 'bird').setScale(1 / SPRITE_RES).setDepth(35).setVisible(false);
  }

  start(): void {
    this.active = true;
    this.leaving = false;
    this.sx = GAME_WIDTH + 60;
    this.dir = -1;
    this.image.setVisible(true);
  }

  /** La potion est finie : l'oiseau s'en va vers la droite. */
  leave(): void {
    if (this.active) this.leaving = true;
  }

  step(dt: number, scrollX: number, time: number): void {
    if (!this.active) return;
    this.sx += this.dir * (this.leaving ? 320 : 190) * dt;
    if (!this.leaving) {
      if (this.sx < MARGIN) this.dir = 1;
      if (this.sx > GAME_WIDTH - MARGIN) this.dir = -1;
    } else {
      this.dir = 1;
      if (this.sx > GAME_WIDTH + 120) {
        this.active = false;
        this.image.setVisible(false);
        return;
      }
    }
    this.image.setFlipX(this.dir < 0);
    this.image.setPosition(scrollX + this.sx, 40 + Math.sin(time * 3) * 8 + Math.sin(time * 18) * 3);
  }
}
