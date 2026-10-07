// Écran titre : choix du mode (Petit / Grand chevalier).

import Phaser from 'phaser';
import { COLORS, CSS, FONT_BODY, FONT_DISPLAY, GAME_HEIGHT, GAME_WIDTH, MODES, SPRITE_RES, type Mode } from '../config';
import { album } from '../systems/album';
import { comicButton } from '../ui/buttons';
import { openAlbum } from './AlbumScene';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(CSS.sky);
    this.add.image(840, 96, 'sun');
    this.add.tileSprite(0, 200, GAME_WIDTH, 300, 'hills-far').setOrigin(0);
    this.add.tileSprite(0, 250, GAME_WIDTH, 300, 'hills-near').setOrigin(0);

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.ink, 1).fillRoundedRect(110, 40, 760, 470, 12);
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(100, 30, 760, 470, 12);
    panel.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(100, 30, 760, 470, 12);

    this.add
      .text(480, 72, 'NIVEAU 1 · LA FORÊT DES GLOUMPFS', { fontFamily: FONT_DISPLAY, fontSize: '22px', color: CSS.banana, backgroundColor: CSS.ink, padding: { x: 12, y: 3 } })
      .setOrigin(0.5);
    this.add
      .text(480, 138, 'MESSIRE PAULOCHON', { fontFamily: FONT_DISPLAY, fontSize: '72px', color: CSS.banana, stroke: CSS.ink, strokeThickness: 10 })
      .setOrigin(0.5)
      .setShadow(5, 5, CSS.ink, 0, true, true);

    const s = 1 / SPRITE_RES;
    this.add.image(190, 290, 'hero').setScale(s * 1.5);
    this.add.image(770, 290, 'princess').setScale(s * 1.3);
    this.add
      .text(480, 252, 'Va retrouver la princesse Mimicracra… si tu y arrives.\nChaque façon de perdre remplit ton album des morts !', {
        fontFamily: FONT_BODY,
        fontSize: '22px',
        color: CSS.ink,
        align: 'center',
        wordWrap: { width: 460 },
      })
      .setOrigin(0.5);

    const start = (mode: Mode) => {
      this.registry.set('mode', mode);
      this.scene.start('Level', { fromCheckpoint: false });
    };
    comicButton(this, 345, 352, MODES.petit.label, () => start('petit'), { width: 270, subtitle: MODES.petit.hint });
    comicButton(this, 615, 352, MODES.grand.label, () => start('grand'), { width: 270, subtitle: MODES.grand.hint, fill: COLORS.tomato, textColor: '#FFFFFF' });

    comicButton(this, 480, 432, `ALBUM DES MORTS  ${album.size} / ${album.total}`, () => openAlbum(this), { width: 400, height: 64, fill: 0xffffff, fontSize: 28 });
    const touch = this.sys.game.device.input.touch;
    this.add
      .text(480, 481, touch ? 'Tablette : flèches à gauche, SAUT et TAPER à droite.' : 'Clavier : flèches (ou Q / D), Espace pour sauter, X pour taper avec l\'épée.', {
        fontFamily: FONT_BODY, fontSize: '16px', color: CSS.muted,
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => start('petit'));
    this.add.text(GAME_WIDTH - 8, GAME_HEIGHT - 6, 'v0.2', { fontFamily: FONT_BODY, fontSize: '14px', color: CSS.ink }).setOrigin(1, 1);
  }
}
