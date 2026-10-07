// Les 4 boss, un par monde : Maman Gloumpf (1), Crapouille (2), Gros Floc (3), le Ronchon (4).
// Chacun se bat dans une arène fermée par des herses (gérées par le LevelScene).
//   1 Maman Gloumpf : saute-lui sur la tête (elle crache de la gelée).
//   2 Crapouille    : grands bonds, saute-lui sur le dos quand il retombe.
//   3 Gros Floc     : trop grand pour le sauter ; renvoie ses boules de neige avec la poêle.
//   4 Ronchon       : trop grand aussi ; boomerang dans la figure, et saute les cailloux de sa massue.
// Après chaque coup il est sonné un instant (inoffensif) : jamais frustrant.

import Phaser from 'phaser';
import { COLORS, CSS, SPRITE_RES } from '../config';
import type { DeathId } from '../data/deaths';
import { overlaps, rectOf, stomping, type Ctx, type Hazard, type Rect, type Target } from './hazard';
import { Projectile } from './Projectile';

export type BossKind = 1 | 2 | 3 | 4;

interface BossSpec {
  tex: string;
  /** Hauteur affichée (px de jeu) et rapport largeur/hauteur de la texture. */
  h: number;
  ratio: number;
  /** Largeur de la zone qui blesse, en fraction de la largeur affichée. */
  bodyW: number;
  death: DeathId;
  name: string;
}

const SPECS: Record<BossKind, BossSpec> = {
  1: { tex: 'gloumpf', h: 120, ratio: 176 / 184, bodyW: 0.8, death: 'maman', name: 'MAMAN GLOUMPF' },
  2: { tex: 'frog', h: 125, ratio: 130 / 96, bodyW: 0.78, death: 'crapouille', name: 'CRAPOUILLE' },
  3: { tex: 'snowman', h: 200, ratio: 110 / 150, bodyW: 0.7, death: 'floc', name: 'GROS FLOC' },
  4: { tex: 'ronchonAwake', h: 200, ratio: 410 / 258, bodyW: 0.5, death: 'massue', name: 'LE RONCHON' },
};

type State = 'wait' | 'walk' | 'alert' | 'rest' | 'crouch' | 'jump' | 'raise' | 'smash' | 'stun' | 'dead';

export class Boss implements Hazard, Target {
  hp: number;
  readonly maxHp: number;
  readonly name: string;
  active = false;
  defeated = false;
  /** Appelé quand le boss est vaincu (le LevelScene ouvre la herse de sortie). */
  onDefeated: () => void = () => undefined;
  private img: Phaser.GameObjects.Image;
  private club?: Phaser.GameObjects.Image;
  private bang: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Ellipse;
  private spec: BossSpec;
  private state: State = 'wait';
  private timer = 0;
  private x: number;
  private y: number; // pieds
  private dir: 1 | -1 = -1;
  private jump = { x0: 0, x1: 0, t: 0, T: 0.95 };
  /** Après le coup, le boss reste inoffensif au toucher encore un instant (le temps de s'écarter). */
  private grace = 0;
  private shotNo = 0;
  private queued: { at: number; high: boolean }[] = [];

  constructor(
    scene: Phaser.Scene,
    private kind: BossKind,
    x: number,
    bottom: number,
    private arena: { left: number; right: number },
    hp: number,
  ) {
    this.spec = SPECS[kind];
    this.name = this.spec.name;
    this.hp = this.maxHp = hp;
    this.x = x;
    this.y = bottom;
    this.baseY = bottom;
    this.img = scene.add.image(x, bottom + 2, this.spec.tex).setOrigin(0.5, 1).setDepth(16);
    this.setScaleXY(1, 1);
    if (kind === 4) this.club = scene.add.image(x, bottom, 'club').setOrigin(0.5, 0.92).setDepth(17);
    this.bang = scene.add
      .text(0, 0, '!', { fontFamily: 'Bangers, Impact, sans-serif', fontSize: '56px', color: '#E63B2E', stroke: CSS.ink, strokeThickness: 9 })
      .setOrigin(0.5)
      .setDepth(45)
      .setVisible(false);
    this.shadow = scene.add.ellipse(x, bottom - 2, 10, 6, COLORS.ink, 0.3).setDepth(3).setVisible(false);
    this.dir = -1;
  }

  /** Échelle de base du sprite (la texture est rasterisée à 2×). */
  private setScaleXY(kx: number, ky: number): void {
    const base = (this.spec.h * SPRITE_RES) / this.img.height / SPRITE_RES;
    // `base` : facteur qui amène la hauteur affichée à spec.h
    this.img.setScale(base * kx, base * ky);
  }

  private get w(): number {
    return this.spec.h * this.spec.ratio;
  }

  get rect(): Rect {
    const w = this.w * this.spec.bodyW;
    return rectOf(this.x - w / 2, this.y - this.spec.h * (this.kind === 4 ? 0.9 : 0.88), w, this.spec.h * (this.kind === 4 ? 0.9 : 0.88));
  }

  canBeHurt(): boolean {
    return this.active && this.kind === 3 && this.state !== 'stun' && this.state !== 'dead';
  }

  /** Renvoi réussi d'une boule de neige (Gros Floc seulement). */
  hurt(c: Ctx): void {
    c.say(this.x - 60, this.y - this.spec.h * 0.7, 'FLOUF !', { size: 46, color: '#FFFFFF' });
    this.damage(c);
  }

  activate(): void {
    if (this.active || this.defeated) return;
    this.active = true;
    this.state = 'rest';
    this.timer = 1.2;
  }

  /** Un coup au but : le boss est sonné 1,6 s ; à zéro, il est vaincu. */
  private damage(c: Ctx): void {
    this.hp--;
    c.sfx('stomp');
    this.timer = 1.6;
    this.state = this.hp <= 0 ? 'dead' : 'stun';
    this.bang.setVisible(false);
    this.shadow.setVisible(false);
    this.club?.setAngle(0);
    if (this.hp <= 0) {
      this.defeated = true;
      this.endFight(c);
    } else {
      c.shake(180, 0.008);
    }
  }

  private endFight(c: Ctx): void {
    const scene = this.img.scene;
    this.img.clearTint().setAngle(0);
    if (this.kind === 4) {
      // le Ronchon s'endort de fatigue (comme au niveau 1) : Zzz
      this.img.setTexture('ronchon');
      this.setScaleXY(1, 1);
      this.club?.destroy();
      for (let i = 0; i < 3; i++) c.say(this.x + i * 40, this.y - this.spec.h - i * 30, 'Z', { size: 40, color: '#FFFFFF', life: 2200 });
    } else {
      scene.tweens.add({
        targets: this.img,
        scaleY: this.img.scaleY * 0.1,
        scaleX: this.img.scaleX * 1.4,
        alpha: 0,
        duration: 700,
        onComplete: () => this.img.destroy(),
      });
    }
    c.burst(this.x, this.y - this.spec.h * 0.5, 14, 0xffd23f, false, 260);
    c.say(this.x, this.y - this.spec.h - 40, 'VAINCU !', { size: 60, life: 1800 });
    c.sfx('win');
    this.onDefeated();
  }

  step(dt: number, c: Ctx): DeathId | null {
    if (this.state === 'dead') {
      this.timer -= dt;
      this.img.setPosition(this.x, this.y + 2);
      return null;
    }
    const hb = c.hero.arcade;
    const dx = hb.center.x - this.x;
    this.timer -= dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.state === 'stun') this.grace = 0.9;
    if (this.state !== 'stun' && this.state !== 'jump') {
      this.dir = dx >= 0 ? 1 : -1;
    }
    this.img.setFlipX(this.kind === 4 ? this.dir > 0 : this.dir < 0);
    if (!this.active) return this.idle(c);

    // Coups reçus
    const r = this.rect;
    if (this.state !== 'stun') {
      if (this.kind === 4 && c.boomerang && overlaps(c.boomerang, r)) {
        c.say(this.x, this.y - this.spec.h - 20, 'AÏE !', { size: 48, color: '#FFFFFF' });
        this.damage(c);
        return null;
      }
      if ((this.kind === 1 || this.kind === 2) && overlaps(c.heroRect, r) && stomping(c.hero, r.y)) {
        c.hero.arcade.setVelocityY(-680);
        c.say(this.x, this.y - this.spec.h - 20, this.kind === 1 ? 'SPLOTCH !' : 'AÏE !', { size: 48, color: CSS.pink });
        this.damage(c);
        return null;
      }
    }

    switch (this.kind) {
      case 1: this.stepMama(dt, c); break;
      case 2: this.stepToad(dt, c); break;
      case 3: this.stepFloc(dt, c); break;
      case 4: this.stepRonchon(dt, c); break;
    }
    this.img.setPosition(this.x, this.y + 2);

    // Toucher le boss (hors sonné et un instant après) = perdu
    if (this.state !== 'stun' && this.grace <= 0 && overlaps(c.heroRect, this.rect)) return this.spec.death;
    return null;
  }

  /** Avant le combat : il attend (et respire). */
  private idle(c: Ctx): DeathId | null {
    this.img.setPosition(this.x, this.y + 2);
    this.setScaleXY(1, 1 + Math.sin(c.t * 2) * 0.012);
    return null;
  }

  private walk(dt: number, speed: number): void {
    this.x = Phaser.Math.Clamp(this.x + this.dir * speed * dt, this.arena.left + this.w * 0.45, this.arena.right - this.w * 0.45);
  }

  private showBang(c: Ctx, on: boolean): void {
    this.bang.setVisible(on).setPosition(this.x, this.y - this.spec.h - 26 + Math.sin(c.t * 22) * 3);
  }

  // ---- 1. Maman Gloumpf : marche, puis crache de la gelée en cloche
  private stepMama(dt: number, c: Ctx): void {
    const f = c.mode.foe;
    this.setScaleXY(1 - Math.sin(c.t * 8) * 0.03, 1 + Math.sin(c.t * 8) * 0.03);
    if (this.state === 'stun') {
      this.setScaleXY(1.3, 0.55);
      this.img.setAngle(Math.sin(c.t * 30) * 4);
      if (this.timer <= 0) {
        this.state = 'walk';
        this.timer = 2.4;
        this.img.setAngle(0);
      }
    } else if (this.state === 'rest' || this.state === 'walk') {
      this.walk(dt, 55 * f);
      if (this.timer <= 0) {
        this.state = 'alert';
        this.timer = 0.95;
        c.sfx('alert');
      }
    } else if (this.state === 'alert') {
      this.setScaleXY(1.1 + Math.sin(c.t * 30) * 0.04, 0.9);
      this.showBang(c, true);
      if (this.timer <= 0) {
        this.showBang(c, false);
        this.state = 'walk';
        this.timer = 3.2 / f;
        c.sfx('slurp');
        const hx = c.hero.arcade.center.x;
        for (const off of [-110, 0, 110]) {
          const tx = Phaser.Math.Clamp(hx + off, this.arena.left + 30, this.arena.right - 30);
          const T = 1.0;
          const x0 = this.x + this.dir * 30;
          c.projectiles.push(new Projectile(c.scene, 'goo', x0, this.y - this.spec.h * 0.8, (tx - x0) / T, 'maman', { vy: -540, ay: 1350, landOnGround: true, r: 14, spin: 5 }));
        }
      }
    }
  }

  // ---- 2. Crapouille : repos, accroupi (ombre au sol), grand bond
  private stepToad(dt: number, c: Ctx): void {
    const f = c.mode.foe;
    if (this.state === 'stun') {
      this.setScaleXY(1.25, 0.6);
      this.img.setAngle(Math.sin(c.t * 30) * 4);
      if (this.timer <= 0) {
        this.state = 'rest';
        this.timer = 1.1;
        this.img.setAngle(0);
      }
    } else if (this.state === 'rest' || this.state === 'walk') {
      this.setScaleXY(1 + Math.sin(c.t * 3) * 0.03, 1 - Math.sin(c.t * 3) * 0.03);
      if (this.timer <= 0) {
        this.state = 'crouch';
        this.timer = 0.9 / (0.6 + f * 0.4);
        const tx = Phaser.Math.Clamp(c.hero.arcade.center.x, this.arena.left + this.w * 0.5, this.arena.right - this.w * 0.5);
        this.jump = { x0: this.x, x1: tx, t: 0, T: 0.95 };
        this.shadow.setVisible(true).setPosition(tx, this.y - 2).setSize(20, 8);
        c.sfx('alert');
      }
    } else if (this.state === 'crouch') {
      const k = 1 - this.timer / (0.9 / (0.6 + f * 0.4));
      this.setScaleXY(1 + k * 0.25, 1 - k * 0.3);
      this.shadow.setSize(30 + k * 110, 10 + k * 10);
      this.showBang(c, this.timer > 0.2);
      if (this.timer <= 0) {
        this.state = 'jump';
        this.showBang(c, false);
        c.sfx('boing');
      }
    } else if (this.state === 'jump') {
      this.jump.t += dt;
      const u = Math.min(1, this.jump.t / this.jump.T);
      this.x = this.jump.x0 + (this.jump.x1 - this.jump.x0) * u;
      this.y = this.groundOf(c) - 4 * 240 * u * (1 - u);
      this.setScaleXY(1 - 0.08 * Math.sin(u * Math.PI), 1 + 0.12 * Math.sin(u * Math.PI));
      this.dir = this.jump.x1 >= this.jump.x0 ? 1 : -1;
      if (u >= 1) {
        this.y = this.groundOf(c);
        this.state = 'rest';
        this.timer = 1.5 / (0.6 + f * 0.4);
        this.shadow.setVisible(false);
        c.sfx('boom');
        c.shake(260, 0.012);
        c.say(this.x, this.y - this.spec.h - 20, 'BOUM !', { size: 52 });
        c.burst(this.x, this.y - 8, 10, 0xe8dcc0, false, 220);
      }
    }
  }

  private baseY: number;
  private groundOf(_c: Ctx): number {
    return this.baseY;
  }

  // ---- 3. Gros Floc : éternue des boules de neige (basses, puis hautes), à renvoyer à la poêle
  private stepFloc(dt: number, c: Ctx): void {
    const f = c.mode.foe;
    for (const q of this.queued) q.at -= dt;
    const due = this.queued.filter((q) => q.at <= 0);
    this.queued = this.queued.filter((q) => q.at > 0);
    for (const q of due) this.fire(c, q.high);

    if (this.state === 'stun') {
      this.img.setAngle(Math.sin(c.t * 25) * 5).setTint(0x9ec8ff);
      this.setScaleXY(1, 1);
      if (this.timer <= 0) {
        this.state = 'rest';
        this.timer = 0.9;
        this.img.setAngle(0).clearTint();
      }
    } else if (this.state === 'rest' || this.state === 'walk') {
      this.setScaleXY(1 + Math.sin(c.t * 2.5) * 0.012, 1 + Math.sin(c.t * 2.5) * 0.012);
      if (this.timer <= 0 && c.seen) {
        this.state = 'alert';
        this.timer = Math.max(0.8, 1.7 - f * 0.6);
        c.sfx('alert');
      }
    } else if (this.state === 'alert') {
      const total = Math.max(0.8, 1.7 - f * 0.6);
      const k = 1 + (1 - this.timer / total) * 0.14;
      this.setScaleXY(k, k);
      this.img.x = this.x + Math.sin(c.t * 55) * 2;
      this.showBang(c, true);
      if (this.timer <= 0) {
        this.showBang(c, false);
        this.state = 'rest';
        this.timer = 2.4 / f;
        this.setScaleXY(1, 1);
        const high = this.shotNo++ % 2 === 1;
        this.fire(c, high);
        // à mi-vie, une deuxième boule suit de près
        if (this.hp * 2 <= this.maxHp) this.queued.push({ at: 0.5, high: !high });
      }
    }
  }

  private fire(c: Ctx, high: boolean): void {
    c.sfx('sneeze');
    c.say(this.x, this.y - this.spec.h - 30, 'ATCHOUM !', { size: 40, color: '#FFFFFF' });
    const f = c.mode.foe;
    c.projectiles.push(
      new Projectile(c.scene, 'snowball', this.x - 70, this.y - (high ? 112 : 24), -245 * f, 'floc', { reflectable: true, r: 16 }),
    );
  }

  // ---- 4. Ronchon : avance, lève la massue (alerte), frappe le sol : deux vagues de cailloux
  private stepRonchon(dt: number, c: Ctx): void {
    const f = c.mode.foe;
    const club = this.club;
    const sway = Math.sin(c.t * 4) * 0.01;
    this.setScaleXY(1 + sway, 1 - sway);
    const side = this.dir;
    if (club) club.setPosition(this.x + side * this.w * 0.42, this.y - 8).setFlipX(side < 0);
    if (this.state === 'stun') {
      this.img.setAngle(Math.sin(c.t * 20) * 3);
      club?.setAngle(side * 40);
      if (this.timer <= 0) {
        this.state = 'rest';
        this.timer = 1.2;
        this.img.setAngle(0);
      }
    } else if (this.state === 'rest' || this.state === 'walk') {
      this.walk(dt, 40 * f);
      club?.setAngle(side * (20 + Math.sin(c.t * 5) * 4));
      if (this.timer <= 0) {
        this.state = 'raise';
        this.timer = Math.max(0.8, 1.5 - f * 0.5);
        c.sfx('alert');
      }
    } else if (this.state === 'raise') {
      const total = Math.max(0.8, 1.5 - f * 0.5);
      const k = 1 - this.timer / total;
      club?.setAngle(side * (20 - k * 130));
      this.img.x = this.x + Math.sin(c.t * 50) * 1.5;
      this.showBang(c, true);
      if (this.timer <= 0) {
        this.showBang(c, false);
        this.state = 'smash';
        this.timer = 0.35;
        club?.setAngle(side * 60);
        c.sfx('boom');
        c.shake(350, 0.015);
        c.say(this.x, this.y - this.spec.h - 20, 'BOUM !', { size: 56 });
        const gy = this.groundOf(c);
        for (const d of [-1, 1] as const) {
          c.projectiles.push(new Projectile(c.scene, 'rock', this.x + d * this.w * 0.5, gy - 18, d * 250 * f, 'massue', { ground: true, r: 17, spin: d * 7 }));
        }
      }
    } else if (this.state === 'smash' && this.timer <= 0) {
      this.state = 'rest';
      this.timer = 2.2 / f;
    }
  }
}
