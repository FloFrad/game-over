// Bulle de BD (Patrick Hand) : rectangle arrondi blanc, contour noir, petite queue vers le bas.
// Le point (x, y) est le bas de la bulle ; la queue dépasse de 16 px en dessous.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_BODY } from '../config';

export class SpeechBubble {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private current = '';

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, depth = 50) {
    this.g = scene.add.graphics();
    this.label = scene.add.text(0, -20, '', { fontFamily: FONT_BODY, fontSize: '22px', color: CSS.ink }).setOrigin(0.5);
    this.container = scene.add.container(x, y, [this.g, this.label]).setDepth(depth);
    this.setText(text);
  }

  setText(text: string): void {
    if (text === this.current) return;
    this.current = text;
    this.label.setText(text);
    const w = this.label.width + 30;
    const h = 40;
    const g = this.g;
    g.clear();
    g.fillStyle(0xffffff, 1).lineStyle(4, COLORS.ink, 1);
    g.fillTriangle(-6, -2, 4, 16, 14, -2).strokeTriangle(-6, -2, 4, 16, 14, -2);
    g.fillRoundedRect(-w / 2, -h, w, h, 16).strokeRoundedRect(-w / 2, -h, w, h, 16);
    g.fillStyle(0xffffff, 1).fillRect(-4, -6, 16, 7); // masque le trait entre la queue et la bulle
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }
}
