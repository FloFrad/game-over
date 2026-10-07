// HUD du niveau : titre, album, son, pause (gros boutons tactiles), barres de potion, compteur d'épée.
// Tout est en coordonnées d'écran (scrollFactor 0).

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_WIDTH, SPRITE_RES } from '../config';
import { album } from '../systems/album';
import { sound } from '../systems/sound';

const DEPTH = 90;
const BTN = 64; // boutons tactiles ≥ 64 px
const S = 1 / SPRITE_RES;

export interface HudState {
  /** Fraction de durée restante (0–1), ou null si la potion n'est pas active. */
  giant: number | null;
  fly: number | null;
  tiny: number | null;
  ghost: number | null;
  /** Outil en main (une icône), ou null. */
  tool: 'sword' | 'pan' | 'boomerang' | null;
  /** Coups d'épée restants (0–4), ou null si le héros n'a pas d'épée. */
  swordLeft: number | null;
}

export interface HudOptions {
  title: string;
  onPause: () => void;
  onAlbum: () => void;
}

/** Bouton blanc à contour noir et ombre décalée (style BD). */
function chipBackground(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0xffffff): void {
  g.fillStyle(COLORS.ink, 1).fillRoundedRect(x + 3, y + 3, w, h, 10);
  g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x, y, w, h, 10);
}

export class Hud {
  private bars: Phaser.GameObjects.Graphics;
  private icons: Record<'giant' | 'fly' | 'tiny' | 'ghost' | 'sword' | 'pan' | 'boomerang', Phaser.GameObjects.Image>;
  private labels: Record<'giant' | 'fly' | 'tiny' | 'ghost', Phaser.GameObjects.Text>;
  private swordBox: Phaser.GameObjects.Graphics;
  private albumText: Phaser.GameObjects.Text;
  private soundIcon: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, opts: HudOptions) {
    const fixed = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T, d = DEPTH): T => {
      o.setScrollFactor(0);
      o.setDepth(d);
      return o;
    };

    // Titre du niveau (à gauche)
    const title = fixed(scene.add.text(26, 35, opts.title, { fontFamily: FONT_DISPLAY, fontSize: '24px', color: CSS.ink })).setOrigin(0, 0.5);
    const titleBg = fixed(scene.add.graphics(), DEPTH - 1);
    chipBackground(titleBg, 14, 12, title.width + 24, 46);

    // Boutons à droite : [ALBUM n/N] [SON] [PAUSE]
    const y = 10;
    const pauseX = GAME_WIDTH - 14 - BTN;
    const soundX = pauseX - 10 - BTN;
    this.albumText = fixed(scene.add.text(0, y + BTN / 2, '', { fontFamily: FONT_DISPLAY, fontSize: '26px', color: CSS.ink })).setOrigin(0, 0.5);
    this.refreshAlbum();
    const albumW = this.albumText.width + 28;
    const albumX = soundX - 10 - albumW;
    this.albumText.setX(albumX + 14);
    const albumBg = fixed(scene.add.graphics(), DEPTH - 1);
    chipBackground(albumBg, albumX, y, albumW, BTN);
    this.hit(albumX, y, albumW, BTN, opts.onAlbum);

    const soundBg = fixed(scene.add.graphics(), DEPTH - 1);
    chipBackground(soundBg, soundX, y, BTN, BTN);
    this.soundIcon = fixed(scene.add.graphics());
    this.drawSound(soundX + BTN / 2, y + BTN / 2);
    this.hit(soundX, y, BTN, BTN, () => {
      sound.toggle();
      this.drawSound(soundX + BTN / 2, y + BTN / 2);
    });

    const pauseBg = fixed(scene.add.graphics(), DEPTH - 1);
    chipBackground(pauseBg, pauseX, y, BTN, BTN);
    const pauseIcon = fixed(scene.add.graphics());
    pauseIcon.fillStyle(COLORS.ink, 1).fillRoundedRect(pauseX + BTN / 2 - 15, y + BTN / 2 - 16, 11, 32, 3).fillRoundedRect(pauseX + BTN / 2 + 4, y + BTN / 2 - 16, 11, 32, 3);
    this.hit(pauseX, y, BTN, BTN, opts.onPause);

    // Barres de potion (centre) et compteur d'épée (gauche), sous la ligne des boutons
    this.bars = fixed(scene.add.graphics());
    this.swordBox = fixed(scene.add.graphics(), DEPTH - 1);
    this.swordBox.setVisible(false);
    chipBackground(this.swordBox, 14, 84, 112, 40);
    this.icons = {
      giant: fixed(scene.add.image(0, 0, 'potionGiant').setScale(S * (40 / 44)), DEPTH + 1).setVisible(false),
      fly: fixed(scene.add.image(0, 0, 'potionPlume').setScale(S * (40 / 44)), DEPTH + 1).setVisible(false),
      tiny: fixed(scene.add.image(0, 0, 'potionMinus').setScale(S * (40 / 44)), DEPTH + 1).setVisible(false),
      ghost: fixed(scene.add.image(0, 0, 'potionGhost').setScale(S * (40 / 44)), DEPTH + 1).setVisible(false),
      sword: fixed(scene.add.image(36, 104, 'sword').setScale(S * (36 / 44)).setAngle(46), DEPTH + 1).setVisible(false),
      pan: fixed(scene.add.image(40, 104, 'pan').setScale(S * 0.42).setAngle(-30), DEPTH + 1).setVisible(false),
      boomerang: fixed(scene.add.image(40, 104, 'boomerang').setScale(S * 0.75), DEPTH + 1).setVisible(false),
    };
    const label = (text: string) => fixed(scene.add.text(0, 0, text, { fontFamily: FONT_DISPLAY, fontSize: '20px', color: CSS.ink }), DEPTH + 1).setOrigin(0, 0.5).setVisible(false);
    this.labels = { giant: label('GÉANT'), fly: label('PLUME'), tiny: label('MINUS'), ghost: label('FANTÔME') };
  }

  /** Zone cliquable invisible, au-dessus du bouton dessiné. */
  private hit(x: number, y: number, w: number, h: number, onClick: () => void): void {
    this.scene.add
      .zone(x + w / 2, y + h / 2, w, h)
      .setScrollFactor(0)
      .setDepth(DEPTH + 5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onClick);
  }

  private drawSound(cx: number, cy: number): void {
    const g = this.soundIcon;
    g.clear();
    g.fillStyle(COLORS.ink, 1).fillPoints(
      [
        new Phaser.Math.Vector2(cx - 17, cy - 7), new Phaser.Math.Vector2(cx - 8, cy - 7), new Phaser.Math.Vector2(cx + 3, cy - 18),
        new Phaser.Math.Vector2(cx + 3, cy + 18), new Phaser.Math.Vector2(cx - 8, cy + 7), new Phaser.Math.Vector2(cx - 17, cy + 7),
      ],
      true,
    );
    if (sound.muted) {
      g.lineStyle(6, COLORS.tomato, 1).lineBetween(cx + 9, cy - 10, cx + 23, cy + 10).lineBetween(cx + 23, cy - 10, cx + 9, cy + 10);
    } else {
      g.lineStyle(4, COLORS.ink, 1);
      g.beginPath().arc(cx + 4, cy, 10, -0.9, 0.9).strokePath();
      g.beginPath().arc(cx + 4, cy, 19, -0.9, 0.9).strokePath();
    }
  }

  refreshAlbum(): void {
    this.albumText.setText(`ALBUM ${album.size}/${album.total}`);
  }

  private drawSwordDots(hits: number): void {
    const g = this.bars;
    for (let i = 0; i < 4; i++) {
      g.fillStyle(i < 4 - hits ? COLORS.wood : COLORS.locked, 1).fillCircle(64 + i * 15, 104, 5.5);
      g.lineStyle(2, COLORS.ink, 1).strokeCircle(64 + i * 15, 104, 5.5);
    }
  }

  update(s: HudState): void {
    const g = this.bars;
    g.clear();

    let y = 84;
    const bar = (kind: 'giant' | 'fly' | 'tiny' | 'ghost', frac: number | null, color: number) => {
      const on = frac !== null;
      this.icons[kind].setVisible(on);
      this.labels[kind].setVisible(on);
      if (!on) return;
      const x = GAME_WIDTH / 2 - 120;
      chipBackground(g, x, y - 4, 240, 44);
      this.icons[kind].setPosition(x + 28, y + 18);
      this.labels[kind].setPosition(x + 54, y + 18);
      g.fillStyle(COLORS.locked, 1).fillRoundedRect(x + 118, y + 8, 110, 20, 8);
      g.fillStyle(color, 1).fillRoundedRect(x + 118, y + 8, Math.max(8, 110 * Phaser.Math.Clamp(frac, 0, 1)), 20, 8);
      g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x + 118, y + 8, 110, 20, 8);
      y += 52;
    };
    bar('giant', s.giant, COLORS.tomato);
    bar('fly', s.fly, COLORS.banana);
    bar('tiny', s.tiny, 0x3e7dd8);
    bar('ghost', s.ghost, 0xb9c4d6);

    // Outil en main : icône dans un cadre (l'épée montre en plus ses coups restants)
    const hasTool = s.tool !== null;
    this.swordBox.setVisible(hasTool);
    this.icons.sword.setVisible(s.tool === 'sword');
    this.icons.pan.setVisible(s.tool === 'pan');
    this.icons.boomerang.setVisible(s.tool === 'boomerang');
    if (s.tool === 'sword') this.drawSwordDots(4 - (s.swordLeft ?? 0));
  }
}
