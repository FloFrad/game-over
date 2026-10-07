// Panneau de fin par-dessus le niveau : GAME OVER (avec la mort débloquée) ou niveau réussi.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_BODY, FONT_DISPLAY, GAME_WIDTH } from '../config';
import { DEATH_BY_ID, type DeathId } from '../data/deaths';
import { album } from '../systems/album';
import { comicButton } from '../ui/buttons';

export type ResultData = { kind: 'death'; deathId: DeathId; isNew: boolean } | { kind: 'win' };

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.ink, 0.45).setOrigin(0);
    const x = 140, y = 50, w = GAME_WIDTH - 280, h = 440;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(x + 10, y + 10, w, h, 12);
    g.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, y, w, h, 12);
    const cx = GAME_WIDTH / 2;

    const retry = () => {
      this.scene.stop('Level');
      this.scene.start('Level', { fromCheckpoint: data.kind === 'death' });
    };
    const menu = () => {
      this.scene.stop('Level');
      this.scene.start('Title');
    };

    if (data.kind === 'death') {
      const d = DEATH_BY_ID[data.deathId];
      this.add
        .text(cx, y + 36, data.isNew ? 'NOUVELLE MORT !' : 'DÉJÀ DANS TON ALBUM', {
          fontFamily: FONT_DISPLAY, fontSize: '22px', color: data.isNew ? CSS.banana : '#FFFFFF', backgroundColor: CSS.ink, padding: { x: 12, y: 3 },
        })
        .setOrigin(0.5);
      const go = this.add
        .text(cx, y + 120, 'GAME OVER', { fontFamily: FONT_DISPLAY, fontSize: '110px', color: CSS.tomato, stroke: CSS.ink, strokeThickness: 12 })
        .setOrigin(0.5)
        .setShadow(8, 8, CSS.banana, 0, false, true)
        .setScale(0.3);
      this.tweens.add({ targets: go, scale: 1, duration: 260, ease: 'Back.Out' });
      this.add.text(cx, y + 210, `Mort n° ${d.n} : ${d.name}`, { fontFamily: FONT_DISPLAY, fontSize: '36px', color: d.color }).setOrigin(0.5);
      this.add
        .text(cx, y + 262, d.txt, { fontFamily: FONT_BODY, fontSize: '24px', color: CSS.ink, align: 'center', wordWrap: { width: w - 80 } })
        .setOrigin(0.5);
      this.add.text(cx, y + 312, `Album des morts : ${album.size} / ${album.total}`, { fontFamily: FONT_BODY, fontSize: '20px', color: CSS.muted }).setOrigin(0.5);
      comicButton(this, cx - 130, y + 380, 'REJOUER', retry, { width: 220 });
      comicButton(this, cx + 130, y + 380, 'MENU', menu, { width: 220, fill: 0xffffff });
    } else {
      this.add
        .text(cx, y + 80, 'NIVEAU 1 RÉUSSI !', { fontFamily: FONT_DISPLAY, fontSize: '74px', color: CSS.banana, stroke: CSS.ink, strokeThickness: 10 })
        .setOrigin(0.5)
        .setShadow(5, 5, CSS.ink, 0, true, true);
      this.add.image(cx - 190, y + 210, 'princess').setScale(0.6);
      this.add
        .text(cx + 50, y + 200, '« Encore toi ?! Bon… le niveau 2,\nc\'est par là. »', { fontFamily: FONT_BODY, fontSize: '26px', color: CSS.ink, backgroundColor: '#FFFFFF', padding: { x: 16, y: 10 } })
        .setOrigin(0.5);
      this.add
        .text(cx, y + 300, `Tu as découvert ${album.size} morts sur ${album.total}.`, { fontFamily: FONT_BODY, fontSize: '24px', color: CSS.ink })
        .setOrigin(0.5);
      comicButton(this, cx - 130, y + 380, 'REJOUER', retry, { width: 220 });
      comicButton(this, cx + 130, y + 380, 'MENU', menu, { width: 220, fill: 0xffffff });
    }

    this.input.keyboard?.once('keydown-ENTER', retry);
    this.input.keyboard?.once('keydown-SPACE', retry);
  }
}
