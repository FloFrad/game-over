// Oiseau affamé : traverse l'écran en haut tant que le héros vole avec la potion Plume, puis disparaît
// un bon moment avant de revenir. Voler trop haut quand il est tout près = il l'attrape (mort « oiseau affamé »).
// Il repart pour de bon quand la Plume est finie.

import Phaser from 'phaser';
import { GAME_WIDTH, SPRITE_RES } from '../config';

const OFFSCREEN = 90;

export class Bird {
  readonly image: Phaser.GameObjects.Image;
  active = false;
  private leaving = false;
  /** Position horizontale dans l'écran (la caméra défile, l'oiseau reste dans le cadre). */
  private sx = 0;
  private dir: 1 | -1 = -1;
  /** Temps restant hors de l'écran avant le prochain passage. */
  private pause = 0;

  constructor(scene: Phaser.Scene, private pauseTime: number) {
    this.image = scene.add.image(0, 40, 'bird').setScale(1 / SPRITE_RES).setDepth(35).setVisible(false);
  }

  start(): void {
    this.active = true;
    this.leaving = false;
    this.pause = 0;
    this.sx = GAME_WIDTH + OFFSCREEN;
    this.dir = -1;
    this.image.setVisible(true);
  }

  /** La potion est finie : l'oiseau s'en va vers la droite. */
  leave(): void {
    if (this.active) {
      this.leaving = true;
      this.pause = 0;
      this.dir = 1;
    }
  }

  /** L'oiseau est-il assez près (et visible) pour attraper un héros qui vole trop haut ? */
  threatens(heroX: number): boolean {
    return this.active && !this.leaving && this.pause <= 0 && Math.abs(this.image.x - heroX) < 230;
  }

  step(dt: number, scrollX: number, time: number): void {
    if (!this.active) return;
    if (this.pause > 0) {
      this.pause -= dt;
      this.image.setVisible(false);
      if (this.pause <= 0) {
        // il revient du côté d'où il est parti, à l'opposé de là où il a disparu
        this.sx = this.dir < 0 ? GAME_WIDTH + OFFSCREEN : -OFFSCREEN;
        this.image.setVisible(true);
      }
      return;
    }
    this.sx += this.dir * (this.leaving ? 320 : 190) * dt;
    const gone = this.dir < 0 ? this.sx < -OFFSCREEN : this.sx > GAME_WIDTH + OFFSCREEN;
    if (gone) {
      if (this.leaving) {
        this.active = false;
        this.image.setVisible(false);
        return;
      }
      // il a traversé l'écran : il disparaît un long moment, puis revient dans l'autre sens
      this.dir = this.dir < 0 ? 1 : -1;
      this.pause = this.pauseTime;
      this.image.setVisible(false);
      return;
    }
    this.image.setFlipX(this.dir < 0);
    this.image.setPosition(scrollX + this.sx, 40 + Math.sin(time * 3) * 8 + Math.sin(time * 18) * 3);
  }
}
