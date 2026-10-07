// Gros boutons « BD » (rectangle arrondi, contour noir, ombre décalée), utilisables au doigt.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_BODY, FONT_DISPLAY } from '../config';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fill?: number;
  textColor?: string;
  subtitle?: string;
  fontSize?: number;
}

export function comicButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 260;
  const h = opts.height ?? (opts.subtitle ? 84 : 68);
  const fill = opts.fill ?? COLORS.banana;

  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    g.clear();
    const o = pressed ? 2 : 5;
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(-w / 2 + o, -h / 2 + o, w, h, 14);
    const d = pressed ? 3 : 0;
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2 + d, -h / 2 + d, w, h, 14);
    g.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(-w / 2 + d, -h / 2 + d, w, h, 14);
  };
  draw(false);

  const title = scene.add
    .text(0, opts.subtitle ? -12 : 0, label, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${opts.fontSize ?? 32}px`,
      color: opts.textColor ?? CSS.ink,
    })
    .setOrigin(0.5);
  const parts: Phaser.GameObjects.GameObject[] = [g, title];
  if (opts.subtitle) {
    parts.push(
      scene.add
        .text(0, 22, opts.subtitle, { fontFamily: FONT_BODY, fontSize: '18px', color: opts.textColor ?? CSS.ink })
        .setOrigin(0.5),
    );
  }

  const c = scene.add.container(x, y, parts).setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerup', () => {
    draw(false);
    onClick();
  });
  return c;
}
