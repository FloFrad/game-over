// Enclume du destin : une ombre qui grossit + « ! » clignotant + sifflement, puis la chute.
// Un piège doit être lisible avant de tuer (docs/GAME_DESIGN.md) : `warn` secondes d'alerte.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, SPRITE_RES } from '../config';

const W = 96;
const H = 50;
const FALL_GRAVITY = 3200;

export type AnvilEvent = 'landed' | null;

export class Anvil {
  /** warn = alerte (ombre), fall = chute, land = posée au sol, done = à retirer. */
  state: 'warn' | 'fall' | 'land' | 'done' = 'warn';
  private top = -70;
  private vy = 0;
  private t: number;
  private landT = 0;
  private shadow: Phaser.GameObjects.Ellipse;
  private alert: Phaser.GameObjects.Text;
  private image: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    readonly x: number,
    private groundY: number,
    private warn: number,
  ) {
    this.t = warn;
    this.shadow = scene.add.ellipse(x, groundY - 1, 36, 12, COLORS.ink, 0.2).setDepth(3);
    this.alert = scene.add
      .text(x, 70, '!', { fontFamily: FONT_DISPLAY, fontSize: '54px', color: CSS.tomato, stroke: CSS.ink, strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(70);
    this.image = scene.add.image(x, this.top - 3, 'anvil').setOrigin(0.5, 0).setScale(1 / SPRITE_RES).setDepth(25).setVisible(false);
    this.label = scene.add
      .text(x + 4, this.top + 28, '100 KG', { fontFamily: FONT_DISPLAY, fontSize: '18px', color: '#FFFFFF' })
      .setOrigin(0.5)
      .setDepth(26)
      .setVisible(false);
  }

  /** Mortelle pendant la chute et juste après l'impact (comme dans le prototype). */
  get lethal(): boolean {
    return this.state === 'fall' || (this.state === 'land' && this.landT > 1.3);
  }

  get rect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - W / 2, this.top, W, H);
  }

  step(dt: number): AnvilEvent {
    let event: AnvilEvent = null;
    if (this.state === 'warn') {
      this.t -= dt;
      const p = 1 - Math.max(0, this.t) / this.warn;
      this.shadow.setSize((18 + 36 * p) * 2, (6 + 4 * p) * 2).setFillStyle(COLORS.ink, 0.2 + 0.3 * p);
      this.alert.setVisible(Math.floor(this.scene.time.now / 125) % 2 === 0);
      if (this.t <= 0) {
        this.state = 'fall';
        this.alert.setVisible(false);
        this.image.setVisible(true);
        this.label.setVisible(true);
        this.shadow.setSize(108, 20).setFillStyle(COLORS.ink, 0.5);
      }
    } else if (this.state === 'fall') {
      this.vy += FALL_GRAVITY * dt;
      this.top += this.vy * dt;
      if (this.top + H >= this.groundY) {
        this.top = this.groundY - H;
        this.state = 'land';
        this.landT = 1.4;
        this.shadow.setVisible(false);
        event = 'landed';
      }
    } else if (this.state === 'land') {
      this.landT -= dt;
      if (this.landT < 0.4) {
        const a = Math.max(0, this.landT / 0.4);
        this.image.setAlpha(a);
        this.label.setAlpha(a);
      }
      if (this.landT <= 0) this.state = 'done';
    }
    this.image.setPosition(this.x, this.top - 3);
    this.label.setPosition(this.x + 4, this.top + 28);
    return event;
  }

  destroy(): void {
    this.shadow.destroy();
    this.alert.destroy();
    this.image.destroy();
    this.label.destroy();
  }
}
