// Carte du royaume : 4 mondes × 3 niveaux. Les niveaux qui n'existent pas encore (ou pas encore
// débloqués) ont un cadenas ; un niveau terminé reçoit une étoile. Un enfant de 5 ans s'y retrouve
// sans lire : des pastilles rondes de 72 px, un seul niveau qui pulse = « c'est par là ».

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_WIDTH, MODES, type Mode } from '../config';
import { WORLDS } from '../data/worlds';
import { LEVELS } from '../levels';
import { album } from '../systems/album';
import { progress } from '../systems/progress';
import { sound } from '../systems/sound';
import { comicButton } from '../ui/buttons';
import { comicText } from '../ui/comicText';
import { openAlbum } from './AlbumScene';

const CARD_W = 200;
const CARD_GAP = 20;
const CARD_TOP = 128;
const CARD_H = 316;
const NODE_R = 36;
const NODE_Y = [232, 316, 400];

type NodeState = 'done' | 'playable' | 'locked';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create(): void {
    const mode = (this.registry.get('mode') as Mode) ?? 'petit';
    this.cameras.main.setBackgroundColor(CSS.sky);
    this.add.image(840, 96, 'sun');
    this.add.tileSprite(0, 200, GAME_WIDTH, 300, 'hills-far').setOrigin(0);
    this.add.tileSprite(0, 250, GAME_WIDTH, 300, 'hills-near').setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, 50, 'CARTE DU ROYAUME', { fontFamily: FONT_DISPLAY, fontSize: '54px', color: CSS.banana, stroke: CSS.ink, strokeThickness: 9 })
      .setOrigin(0.5)
      .setShadow(4, 4, CSS.ink, 0, true, true);
    this.add
      .text(GAME_WIDTH / 2, 100, MODES[mode].label, { fontFamily: FONT_DISPLAY, fontSize: '20px', color: CSS.banana, backgroundColor: CSS.ink, padding: { x: 12, y: 3 } })
      .setOrigin(0.5);

    const left = (GAME_WIDTH - (WORLDS.length * CARD_W + (WORLDS.length - 1) * CARD_GAP)) / 2;
    WORLDS.forEach((w, i) => this.buildWorld(w, left + i * (CARD_W + CARD_GAP)));

    comicButton(this, 140, 494, 'RETOUR', () => this.scene.start('Title'), { width: 220, height: 64, fill: 0xffffff, fontSize: 28 });
    comicButton(this, GAME_WIDTH - 190, 494, `ALBUM ${album.size}/${album.total}`, () => openAlbum(this), { width: 280, height: 64, fill: 0xffffff, fontSize: 28 });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  private buildWorld(w: (typeof WORLDS)[number], x: number): void {
    const cx = x + CARD_W / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(x + 8, CARD_TOP + 8, CARD_W, CARD_H, 12);
    g.fillStyle(COLORS.paper, 1).fillRoundedRect(x, CARD_TOP, CARD_W, CARD_H, 12);
    // bannière du monde
    g.fillStyle(w.color, 1).fillRoundedRect(x, CARD_TOP, CARD_W, 58, { tl: 12, tr: 12, bl: 0, br: 0 });
    g.lineStyle(4, COLORS.ink, 1).lineBetween(x, CARD_TOP + 58, x + CARD_W, CARD_TOP + 58);
    g.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, CARD_TOP, CARD_W, CARD_H, 12);
    this.add
      .text(cx, CARD_TOP + 29, w.name, { fontFamily: FONT_DISPLAY, fontSize: '22px', color: '#FFFFFF', stroke: CSS.ink, strokeThickness: 5, align: 'center', wordWrap: { width: CARD_W - 20 } })
      .setOrigin(0.5);

    // pointillés entre les niveaux
    const dots = this.add.graphics();
    dots.fillStyle(COLORS.ink, 1);
    for (let n = 0; n < 2; n++) {
      for (let k = 1; k <= 3; k++) dots.fillCircle(cx, NODE_Y[n] + NODE_R + 3 + k * ((NODE_Y[n + 1] - NODE_Y[n] - 2 * NODE_R - 6) / 4), 3);
    }

    w.levels.forEach((id, n) => this.buildNode(id, cx, NODE_Y[n], w.color));
  }

  private stateOf(id: number): NodeState {
    if (!LEVELS[id]) return 'locked'; // pas encore dessiné : « bientôt »
    if (progress.isDone(id)) return 'done';
    return progress.isUnlocked(id) ? 'playable' : 'locked';
  }

  private buildNode(id: number, x: number, y: number, color: number): void {
    const state = this.stateOf(id);
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const fill = state === 'locked' ? COLORS.locked : state === 'done' ? color : COLORS.banana;
    g.fillStyle(COLORS.ink, 1).fillCircle(4, 4, NODE_R);
    g.fillStyle(fill, 1).fillCircle(0, 0, NODE_R);
    g.lineStyle(5, COLORS.ink, 1).strokeCircle(0, 0, NODE_R);
    c.add(g);

    if (state === 'locked') {
      const lock = this.add.graphics();
      lock.lineStyle(5, COLORS.ink, 1).beginPath().arc(0, -7, 9, Math.PI, 0).strokePath();
      lock.lineBetween(-9, -7, -9, 0).lineBetween(9, -7, 9, 0);
      lock.fillStyle(0x8a8474, 1).fillRoundedRect(-14, -2, 28, 22, 4);
      lock.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(-14, -2, 28, 22, 4);
      lock.fillStyle(COLORS.ink, 1).fillCircle(0, 7, 3).fillRect(-1.5, 8, 3, 7);
      c.add(lock);
    } else {
      c.add(this.add.text(0, state === 'done' ? -4 : 0, String(id), { fontFamily: FONT_DISPLAY, fontSize: '42px', color: CSS.ink }).setOrigin(0.5));
      if (state === 'done') c.add(this.star(0, 26, 15));
    }

    c.setSize(NODE_R * 2 + 8, NODE_R * 2 + 8).setInteractive({ useHandCursor: state !== 'locked' });
    if (state === 'playable') this.tweens.add({ targets: c, scale: 1.12, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
    c.on('pointerup', () => {
      if (state === 'locked') {
        // petit tremblement + « BIENTÔT ! » (pas de texte à lire pour comprendre : le cadenas parle)
        this.tweens.add({ targets: c, angle: { from: -8, to: 8 }, yoyo: true, repeat: 2, duration: 60, onComplete: () => c.setAngle(0) });
        comicText(this, x, y, 'BIENTÔT !', { size: 30, color: '#FFFFFF' });
        return;
      }
      sound.play('pop');
      this.scene.start('Level', { levelId: id, fromCheckpoint: false });
    });
  }

  private star(x: number, y: number, r: number): Phaser.GameObjects.Graphics {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    return this.add.graphics().fillStyle(COLORS.banana, 1).fillPoints(pts, true).lineStyle(3, COLORS.ink, 1).strokePoints(pts, true);
  }
}
