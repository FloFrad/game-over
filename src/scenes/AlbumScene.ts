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
const PER_PAGE = 8;
/** Page ouverte (gardée d'une ouverture à l'autre). */
let page = 0;
/** Cheat code : taper EFFACE dans l'album, puis toucher une case pour la remettre à « ? ». */
const CHEAT = 'EFFACE';
let eraseMode = false;

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
      eraseMode = false;
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
      .text(
        GAME_WIDTH / 2,
        102,
        eraseMode ? 'EFFACEMENT : touche une case (retape EFFACE pour quitter)' : `${album.size} / ${album.total} morts découvertes`,
        eraseMode
          ? { fontFamily: FONT_BODY, fontSize: '20px', color: '#FFFFFF', backgroundColor: CSS.tomato, padding: { x: 10, y: 2 } }
          : { fontFamily: FONT_BODY, fontSize: '22px', color: CSS.muted },
      )
      .setOrigin(0.5);

    // Grille : 4 colonnes × 2 rangées par page, une page par groupe de morts (flèches ◀ ▶)
    const pages = Math.ceil(DEATHS.length / PER_PAGE);
    page = Math.min(page, pages - 1);
    const left = (GAME_WIDTH - (4 * CARD_W + 3 * GAP_X)) / 2;
    DEATHS.slice(page * PER_PAGE, (page + 1) * PER_PAGE).forEach((d, i) => {
      const cx = left + CARD_W / 2 + (i % 4) * (CARD_W + GAP_X);
      const cy = GRID_TOP + CARD_H / 2 + Math.floor(i / 4) * (CARD_H + GAP_Y);
      const card = this.add.container(cx, cy);
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
      if (eraseMode && open) {
        // mode effacement : la case tremble et rougit ; un toucher la réinitialise
        bg.lineStyle(5, COLORS.tomato, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
        this.tweens.add({ targets: card, angle: { from: -1.2, to: 1.2 }, yoyo: true, repeat: -1, duration: 90 });
        card.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
        card.on('pointerup', () => {
          album.remove(d.id);
          this.scene.restart(data);
        });
      }
      card.add(
        this.add
          .text(0, 56, open ? d.name : 'Mort secrète', { fontFamily: FONT_BODY, fontSize: open && d.name.length > 24 ? '15px' : '18px', color: open ? CSS.ink : CSS.muted })
          .setOrigin(0.5),
      );
    });

    // Changer de page (grosses flèches : tactile)
    const go = (delta: number) => {
      page = (page + delta + pages) % pages;
      this.scene.restart(data);
    };
    if (pages > 1) {
      comicButton(this, 150, 488, '◀', () => go(-1), { width: 120, height: 64, fill: 0xffffff, fontSize: 34 });
      comicButton(this, GAME_WIDTH - 150, 488, '▶', () => go(1), { width: 120, height: 64, fill: 0xffffff, fontSize: 34 });
      this.add
        .text(GAME_WIDTH / 2 + 190, 488, `page ${page + 1} / ${pages}`, { fontFamily: FONT_BODY, fontSize: '20px', color: CSS.muted })
        .setOrigin(0.5);
      this.input.keyboard?.on('keydown-LEFT', () => go(-1));
      this.input.keyboard?.on('keydown-RIGHT', () => go(1));
    }

    // Cheat code : taper EFFACE active / désactive le mode effacement
    let typed = '';
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toUpperCase()).slice(-CHEAT.length);
      if (typed === CHEAT) {
        eraseMode = !eraseMode;
        this.scene.restart(data);
      }
    });

    comicButton(this, GAME_WIDTH / 2 - 40, 488, 'FERMER', close, { width: 260 });
    this.input.keyboard?.on('keydown-ESC', close);
    this.input.keyboard?.on('keydown-ENTER', close);
  }
}
