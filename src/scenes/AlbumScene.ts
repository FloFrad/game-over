// Album des morts : une case de BD par mort (vignette), les morts non découvertes sont des « ? ».
// Affiché par-dessus la scène qui l'appelle (titre, niveau, pause, résultat) ; ferme avec FERMER / Échap.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_BODY, FONT_DISPLAY, GAME_WIDTH } from '../config';
import { DEATHS } from '../data/deaths';
import { album } from '../systems/album';
import { comicButton } from '../ui/buttons';
import { buildDeathPanel, PANEL_W } from '../ui/deathPanel';

const CARD_W = 198;
const CARD_H = 152;
const GAP_X = 16;
const GAP_Y = 14;
const GRID_TOP = 124;

/** Ouvre l'album par-dessus `from` (qui est mise en pause et reprend à la fermeture). */
export function openAlbum(from: Phaser.Scene): void {
  from.scene.pause();
  from.scene.launch('Album', { caller: from.scene.key });
}

export class AlbumScene extends Phaser.Scene {
  constructor() {
    super('Album');
  }

  create(data: { caller: string }): void {
    const close = () => {
      this.scene.stop();
      this.scene.resume(data.caller);
    };

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.ink, 0.6).setOrigin(0);
    const x = 30, y = 14, w = GAME_WIDTH - 60, h = 512;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(x + 10, y + 10, w, h, 12);
    g.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, y, w, h, 12);

    this.add
      .text(GAME_WIDTH / 2, 58, 'ALBUM DES MORTS', { fontFamily: FONT_DISPLAY, fontSize: '50px', color: CSS.banana, stroke: CSS.ink, strokeThickness: 8 })
      .setOrigin(0.5)
      .setShadow(4, 4, CSS.ink, 0, true, true);
    this.add
      .text(GAME_WIDTH / 2, 102, `${album.size} / ${album.total} morts découvertes`, { fontFamily: FONT_BODY, fontSize: '22px', color: CSS.muted })
      .setOrigin(0.5);

    // Grille : 4 colonnes (6 s'il y a beaucoup de morts, les cartes rétrécissent)
    const cols = DEATHS.length <= 8 ? 4 : 6;
    const k = cols === 4 ? 1 : (840 - (cols - 1) * GAP_X) / cols / CARD_W;
    const gridW = cols * CARD_W * k + (cols - 1) * GAP_X;
    const left = (GAME_WIDTH - gridW) / 2;
    DEATHS.forEach((d, i) => {
      const cx = left + (CARD_W * k) / 2 + (i % cols) * (CARD_W * k + GAP_X);
      const cy = GRID_TOP + (CARD_H * k) / 2 + Math.floor(i / cols) * (CARD_H * k + GAP_Y);
      const card = this.add.container(cx, cy).setScale(k);
      const open = album.has(d.id);

      const bg = this.add.graphics();
      bg.fillStyle(COLORS.ink, 1).fillRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W, CARD_H, 10);
      bg.fillStyle(open ? 0xffffff : COLORS.locked, 1).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      bg.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      card.add(bg);

      if (open) {
        const art = buildDeathPanel(this, d.id).setScale((CARD_W - 28) / PANEL_W).setPosition(0, -14);
        card.add(art);
      } else {
        card.add(this.add.text(0, -14, '?', { fontFamily: FONT_DISPLAY, fontSize: '78px', color: CSS.muted }).setOrigin(0.5));
        card.add(this.add.text(-CARD_W / 2 + 12, -CARD_H / 2 + 8, `N° ${d.n}`, { fontFamily: FONT_DISPLAY, fontSize: '22px', color: CSS.muted }));
      }
      card.add(
        this.add
          .text(0, 56, open ? d.name : 'Mort secrète', { fontFamily: FONT_BODY, fontSize: '18px', color: open ? CSS.ink : CSS.muted })
          .setOrigin(0.5),
      );
    });

    comicButton(this, GAME_WIDTH / 2, 488, 'FERMER', close, { width: 260 });
    this.input.keyboard?.on('keydown-ESC', close);
    this.input.keyboard?.on('keydown-ENTER', close);
  }
}
