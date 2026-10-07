// Fin d'une partie, par-dessus le niveau.
//
// Mort : d'abord la CASE DE BD (grande illustration de la mort, le temps de bien la voir), puis elle
// rétrécit en vignette et laisse la place au panneau GAME OVER avec REJOUER. Victoire : panneau direct.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_BODY, FONT_DISPLAY, GAME_WIDTH } from '../config';
import { DEATH_BY_ID, type DeathId } from '../data/deaths';
import { LEVELS } from '../levels';
import { album } from '../systems/album';
import { sound } from '../systems/sound';
import { comicButton } from '../ui/buttons';
import { buildDeathPanel } from '../ui/deathPanel';
import { openAlbum } from './AlbumScene';

export type ResultData = { kind: 'death'; deathId: DeathId; isNew: boolean } | { kind: 'win' };

/** Durée d'affichage de la grande case avant la suite automatique (ms). */
const PANEL_TIME_NEW = 3600;
const PANEL_TIME_SEEN = 2600;
/** Pendant ce délai, on ne peut pas passer la case (un enfant qui tape sur SAUT ne la zappe pas). */
const SKIP_LOCK = 800;

// Panneau de résultat
const BOX = { x: 60, y: 36, w: GAME_WIDTH - 120, h: 468 };
const CX = GAME_WIDTH / 2;
const BTN_Y = 442;
// Où la case de BD vient se ranger une fois réduite
const THUMB = { x: 270, y: 272, scale: 0.46, angle: -0.04 };

export class ResultScene extends Phaser.Scene {
  private phase: 'panel' | 'result' = 'result';
  private canSkip = false;
  private advance?: () => void;
  private retry!: () => void;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.phase = 'result';
    this.canSkip = false;
    this.advance = undefined;
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORS.ink, 0.5).setOrigin(0);

    this.retry = () => {
      this.scene.stop('Level');
      this.scene.start('Level', { fromCheckpoint: data.kind === 'death' });
    };

    if (data.kind === 'death') this.playPanel(data);
    else {
      this.drawBox(1);
      this.showWin();
    }

    // Entrée / Espace : passe la case de BD, puis relance la partie
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (this.phase === 'panel') this.skipPanel();
      else if (this.canSkip) this.retry();
    };
    this.input.keyboard?.on('keydown-ENTER', onKey);
    this.input.keyboard?.on('keydown-SPACE', onKey);
    this.time.delayedCall(SKIP_LOCK, () => (this.canSkip = true));
  }

  // ------------------------------------------------------------------ la case de BD

  private skipPanel(): void {
    if (this.canSkip) this.advance?.();
  }

  private playPanel(data: Extract<ResultData, { kind: 'death' }>): void {
    this.phase = 'panel';
    sound.play('pop');

    const panel = buildDeathPanel(this, data.deathId, true).setDepth(10).setPosition(CX, 268).setRotation(-0.03).setScale(0.15);
    this.tweens.add({ targets: panel, scale: 1, duration: 380, ease: 'Back.Out' });

    const badge = this.add
      .text(CX, 36, data.isNew ? '★ NOUVELLE MORT ! ★' : 'DÉJÀ DANS TON ALBUM', {
        fontFamily: FONT_DISPLAY, fontSize: '28px', color: data.isNew ? CSS.banana : '#FFFFFF', backgroundColor: CSS.ink, padding: { x: 14, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setScale(0.4);
    this.tweens.add({ targets: badge, scale: 1, duration: 260, delay: 250, ease: 'Back.Out' });

    // Gros bouton « suite » (une icône : l'enfant de 5 ans ne lit pas)
    const next = this.add.container(GAME_WIDTH - 70, 484).setDepth(12);
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillCircle(5, 5, 36);
    g.fillStyle(COLORS.banana, 1).fillCircle(0, 0, 36);
    g.lineStyle(5, COLORS.ink, 1).strokeCircle(0, 0, 36);
    g.fillStyle(COLORS.ink, 1).fillTriangle(-9, -17, -9, 17, 18, 0);
    next.add(g).setSize(76, 76).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: next, scale: 1.12, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
    next.on('pointerup', () => this.skipPanel());

    let done = false;
    const timer = this.time.delayedCall(data.isNew ? PANEL_TIME_NEW : PANEL_TIME_SEEN, () => this.advance?.());
    this.advance = () => {
      if (done) return;
      done = true;
      timer.remove();
      this.phase = 'result';
      this.canSkip = false;
      this.time.delayedCall(300, () => (this.canSkip = true));
      next.destroy();
      badge.destroy();
      this.showDeathResult(data, panel);
    };
    // Un toucher n'importe où passe la case
    this.input.on('pointerup', () => this.skipPanel());
  }

  // ------------------------------------------------------------------ panneau de résultat

  private drawBox(alpha: number): Phaser.GameObjects.Graphics {
    const { x, y, w, h } = BOX;
    const g = this.add.graphics().setDepth(1).setAlpha(alpha);
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(x + 10, y + 10, w, h, 12);
    g.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, y, w, h, 12);
    return g;
  }

  /** Fait apparaître un objet avec un petit « pop ». */
  private pop<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform>(o: T, delay = 0): T {
    o.setScale(0.5);
    this.tweens.add({ targets: o, scale: 1, duration: 240, delay, ease: 'Back.Out' });
    return o;
  }

  private buttons(opts: { next?: number; replay?: boolean } = {}): void {
    const map = () => {
      this.scene.stop('Level');
      this.scene.start('Map');
    };
    const list: [string, () => void, { width: number; fill?: number }][] = [];
    if (opts.next) {
      const id = opts.next;
      list.push([`NIVEAU ${id}`, () => { this.scene.stop('Level'); this.scene.start('Level', { levelId: id, fromCheckpoint: false }); }, { width: 250 }]);
    }
    if (opts.replay !== false) list.push(['REJOUER', this.retry, opts.next ? { width: 200, fill: 0xffffff } : { width: 280 }]);
    list.push(['ALBUM', () => openAlbum(this), { width: 200, fill: 0xffffff }]);
    list.push(['CARTE', map, { width: 200, fill: 0xffffff }]);
    const total = list.reduce((n, [, , o]) => n + o.width + 16, -16);
    let x = (GAME_WIDTH - total) / 2;
    list.forEach(([label, fn, o], i) => {
      this.pop(comicButton(this, x + o.width / 2, BTN_Y, label, fn, o).setDepth(5), i * 60);
      x += o.width + 16;
    });
  }

  private showDeathResult(data: Extract<ResultData, { kind: 'death' }>, panel: Phaser.GameObjects.Container): void {
    const d = DEATH_BY_ID[data.deathId];
    const box = this.drawBox(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 300 });
    // La case rétrécit et va se ranger à gauche
    this.tweens.add({
      targets: panel,
      x: THUMB.x,
      y: THUMB.y,
      scale: THUMB.scale,
      rotation: THUMB.angle,
      duration: 420,
      ease: 'Cubic.InOut',
      onComplete: () => reveal(),
    });

    const reveal = () => {
      const col = 655;
      this.add
        .text(CX, BOX.y + 34, data.isNew ? 'NOUVELLE MORT !' : 'DÉJÀ DANS TON ALBUM', {
          fontFamily: FONT_DISPLAY, fontSize: '22px', color: data.isNew ? CSS.banana : '#FFFFFF', backgroundColor: CSS.ink, padding: { x: 12, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(5);
      const finale = data.deathId === 'sauvetage';
      const go = this.add
        .text(CX, 130, finale ? 'FIN !' : 'GAME OVER', { fontFamily: FONT_DISPLAY, fontSize: '92px', color: finale ? CSS.banana : CSS.tomato, stroke: CSS.ink, strokeThickness: 11 })
        .setOrigin(0.5)
        .setShadow(7, 7, CSS.banana, 0, false, true)
        .setDepth(5);
      this.pop(go);
      this.add.text(col, 216, `Mort n° ${d.n}`, { fontFamily: FONT_BODY, fontSize: '21px', color: CSS.muted }).setOrigin(0.5).setDepth(5);
      this.add
        .text(col, 254, d.name, { fontFamily: FONT_DISPLAY, fontSize: '36px', color: d.color, align: 'center', wordWrap: { width: 430 } })
        .setOrigin(0.5)
        .setDepth(5);
      this.add
        .text(col, 322, finale ? 'Messire Paulochon a sauvé la princesse… ou presque. Merci d’avoir joué !' : d.txt, { fontFamily: FONT_BODY, fontSize: '23px', color: CSS.ink, align: 'center', wordWrap: { width: 420 } })
        .setOrigin(0.5)
        .setDepth(5);
      this.add
        .text(col, 384, `Album des morts : ${album.size} / ${album.total}`, { fontFamily: FONT_BODY, fontSize: '20px', color: CSS.muted })
        .setOrigin(0.5)
        .setDepth(5);
      this.buttons({ replay: !finale });
    };
  }

  private showWin(): void {
    const levelId: number = this.registry.get('levelId') ?? 1;
    const next = !!LEVELS[levelId + 1];
    this.pop(
      this.add
        .text(CX, 112, `NIVEAU ${levelId} RÉUSSI !`, { fontFamily: FONT_DISPLAY, fontSize: '74px', color: CSS.banana, stroke: CSS.ink, strokeThickness: 10 })
        .setOrigin(0.5)
        .setShadow(5, 5, CSS.ink, 0, true, true)
        .setDepth(5),
    );
    this.add.image(CX - 190, 250, 'princess').setScale(0.6).setDepth(5);
    this.add
      .text(CX + 50, 240, next ? `« Encore toi ?! Bon… le niveau ${levelId + 1},\nc'est par là. »` : '« Encore toi ?! Bon… la suite,\nc\'est pour bientôt ! »', { fontFamily: FONT_BODY, fontSize: '26px', color: CSS.ink, backgroundColor: '#FFFFFF', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setDepth(5);
    const found = album.size < album.total
      ? `Tu as découvert ${album.size} morts sur ${album.total}. Il en reste de cachées !`
      : `Album complet : les ${album.total} morts ! Bravo, chevalier.`;
    this.add.text(CX, 350, found, { fontFamily: FONT_BODY, fontSize: '24px', color: CSS.ink }).setOrigin(0.5).setDepth(5);
    this.buttons({ next: next ? levelId + 1 : undefined });
  }
}
