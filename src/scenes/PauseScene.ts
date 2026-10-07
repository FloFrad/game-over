// Pause : panneau par-dessus le niveau (Échap, P ou bouton du HUD).

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_WIDTH } from '../config';
import { comicButton } from '../ui/buttons';
import { openAlbum } from './AlbumScene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const resume = () => {
      this.scene.stop();
      this.scene.resume('Level');
    };
    const menu = () => {
      this.scene.stop('Level');
      this.scene.start('Title');
    };

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.ink, 0.5).setOrigin(0);
    const w = 460, h = 440, x = (GAME_WIDTH - w) / 2, y = 50;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(x + 10, y + 10, w, h, 12);
    g.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, y, w, h, 12);

    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, y + 70, 'PAUSE', { fontFamily: FONT_DISPLAY, fontSize: '84px', color: CSS.banana, stroke: CSS.ink, strokeThickness: 10 })
      .setOrigin(0.5)
      .setShadow(5, 5, CSS.ink, 0, true, true);
    comicButton(this, cx, y + 180, 'REPRENDRE', resume, { width: 340, fontSize: 38 });
    comicButton(this, cx, y + 275, 'ALBUM', () => openAlbum(this), { width: 340, fill: 0xffffff });
    comicButton(this, cx, y + 370, 'MENU', menu, { width: 340, fill: 0xffffff });

    this.input.keyboard?.on('keydown-ESC', resume);
    this.input.keyboard?.on('keydown-P', resume);
  }
}
