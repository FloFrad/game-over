// Boutons tactiles à l'écran (iPad) : ← → en bas à gauche, TAPER et SAUT en bas à droite.
// Affichés seulement sur les appareils tactiles. Multi-touch : on peut courir et sauter en même temps.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Controls, TouchKey } from '../systems/Controls';

interface PadDef {
  key: TouchKey;
  x: number;
  y: number;
  r: number;
  fill: number;
  label: string;
  color: string;
}

export function addTouchControls(scene: Phaser.Scene, controls: Controls): void {
  if (!scene.sys.game.device.input.touch) return;
  scene.input.addPointer(3);

  const y = GAME_HEIGHT - 68;
  const pads: PadDef[] = [
    { key: 'left', x: 72, y, r: 50, fill: 0xffffff, label: '◀', color: CSS.ink },
    { key: 'right', x: 190, y, r: 50, fill: 0xffffff, label: '▶', color: CSS.ink },
    { key: 'attack', x: GAME_WIDTH - 210, y, r: 50, fill: COLORS.tomato, label: 'TAPER', color: '#FFFFFF' },
    { key: 'jump', x: GAME_WIDTH - 80, y: y - 8, r: 60, fill: COLORS.banana, label: 'SAUT', color: CSS.ink },
  ];

  for (const p of pads) {
    const circle = scene.add
      .circle(p.x, p.y, p.r, p.fill, 0.8)
      .setStrokeStyle(4, COLORS.ink)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();
    scene.add
      .text(p.x, p.y, p.label, { fontFamily: FONT_DISPLAY, fontSize: p.label.length > 1 ? '24px' : '34px', color: p.color })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101);

    const set = (down: boolean) => {
      controls.setTouch(p.key, down);
      circle.setFillStyle(p.fill, down ? 1 : 0.8);
    };
    circle.on('pointerdown', () => set(true));
    circle.on('pointerup', () => set(false));
    circle.on('pointerout', () => set(false));
  }
}
