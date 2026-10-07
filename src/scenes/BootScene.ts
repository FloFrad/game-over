// Chargement : sprites SVG (rasterisés à 2×), textures générées, polices.

import Phaser from 'phaser';
import { BIG_SPRITES, SPRITE_RES, SPRITES, type BigSpriteKey, type SpriteKey } from '../config';
import { generateTextures } from '../gfx/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const bar = this.add.rectangle(480, 270, 4, 24, 0xffd23f).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => bar.setSize(Math.max(4, p * 400), 24).setX(280));

    for (const [key, s] of Object.entries(SPRITES) as [SpriteKey, (typeof SPRITES)[SpriteKey]][]) {
      const h = s.h * SPRITE_RES;
      this.load.svg(key, `assets/svg/${s.file}.svg`, { width: Math.round(h * SPRITES[key].r), height: h });
    }
    // Grandes versions pour les cases de BD
    for (const [key, res] of Object.entries(BIG_SPRITES) as [BigSpriteKey, number][]) {
      const h = SPRITES[key].h * res;
      this.load.svg(`${key}Big`, `assets/svg/${SPRITES[key].file}.svg`, { width: Math.round(h * SPRITES[key].r), height: h });
    }
  }

  create(): void {
    generateTextures(this);
    const fonts = document.fonts
      ? Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('22px "Patrick Hand"')])
      : Promise.resolve([]);
    const timeout = new Promise((r) => setTimeout(r, 2500));
    Promise.race([fonts, timeout])
      .catch(() => undefined)
      .then(() => this.scene.start('Title'));
  }
}
