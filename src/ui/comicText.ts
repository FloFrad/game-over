// Onomatopées façon BD : texte Bangers jaune/blanc, gros contour noir, effet « pop ».

import Phaser from 'phaser';
import { CSS, FONT_DISPLAY } from '../config';

export interface ComicTextOptions {
  size?: number;
  color?: string;
  /** Durée d'affichage avant disparition (ms). 0 = reste affiché. */
  life?: number;
  scrollFactor?: number;
  depth?: number;
}

export function comicText(scene: Phaser.Scene, x: number, y: number, text: string, opts: ComicTextOptions = {}): Phaser.GameObjects.Text {
  const size = opts.size ?? 48;
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${size}px`,
      color: opts.color ?? CSS.banana,
      stroke: CSS.ink,
      strokeThickness: Math.max(5, Math.round(size * 0.2)),
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(opts.depth ?? 60)
    .setScrollFactor(opts.scrollFactor ?? 1)
    .setAngle(Phaser.Math.Between(-8, 8))
    .setScale(0.4);

  scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
  const life = opts.life ?? 900;
  if (life > 0) {
    scene.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: life, duration: 400, onComplete: () => t.destroy() });
  }
  return t;
}
