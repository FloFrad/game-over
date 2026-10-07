// Monstres et pièges des mondes 1 à 4 (hors boss) : ruche, grenouille, escargot, armure, moustique,
// porte-bouche, coffre qui mord, stalactite, tireurs (bonhomme de neige, dragon).
// Chacun suit l'interface Hazard : une alerte lisible (secousse, « ! », bruit) AVANT de pouvoir tuer.

import Phaser from 'phaser';
import { COLORS, CSS, SPRITE_RES } from '../config';
import type { DeathId } from '../data/deaths';
import { overlaps, rectOf, stomping, type Ctx, type Hazard, type Rect, type Target } from './hazard';
import { Projectile } from './Projectile';

const S = 1 / SPRITE_RES;

/** Un monstre écrasé : il s'aplatit et disparaît. */
function squash(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  scene.tweens.add({ targets: img, scaleY: img.scaleY * 0.1, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => img.destroy() });
}

/** Petit « ! » qui sautille au-dessus d'un monstre en alerte. */
class Bang {
  private t: Phaser.GameObjects.Text;
  constructor(scene: Phaser.Scene) {
    this.t = scene.add
      .text(0, 0, '!', { fontFamily: 'Bangers, Impact, sans-serif', fontSize: '44px', color: '#E63B2E', stroke: CSS.ink, strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(45)
      .setVisible(false);
  }

  show(x: number, y: number, t: number): void {
    this.t.setVisible(true).setPosition(x, y + Math.sin(t * 22) * 3);
  }

  hide(): void {
    this.t.setVisible(false);
  }

  destroy(): void {
    this.t.destroy();
  }
}

// ------------------------------------------------------------------ ruche et abeilles (monde 1)

interface Bee {
  img: Phaser.GameObjects.Image;
  ang: number;
  dead: boolean;
}

export class Beehive implements Hazard {
  private hive: Phaser.GameObjects.Image;
  private bees: Bee[] = [];
  private bang: Bang;
  private state: 'idle' | 'alert' | 'swarm' | 'rest' = 'idle';
  private timer = 0;
  private hx: number;
  private hy: number;

  constructor(scene: Phaser.Scene, x: number, bottom: number) {
    this.hx = x;
    this.hy = bottom - 31;
    const rope = scene.add.graphics().setDepth(4);
    rope.lineStyle(5, COLORS.ink, 1).lineBetween(x, bottom - 62, x, bottom - 100);
    rope.lineStyle(2, 0x8a5a2b, 1).lineBetween(x, bottom - 62, x, bottom - 100);
    this.hive = scene.add.image(x, bottom, 'beehive').setOrigin(0.5, 1).setScale(S).setDepth(5);
    for (let i = 0; i < 5; i++) {
      this.bees.push({ img: scene.add.image(x, this.hy, 'bee').setScale(S).setDepth(17), ang: (i / 5) * Math.PI * 2, dead: false });
    }
    this.bang = new Bang(scene);
  }

  step(dt: number, c: Ctx): DeathId | null {
    const hero = c.hero;
    const hb = hero.arcade;
    this.timer -= dt;
    const near = c.seen && Math.abs(hb.center.x - this.hx) < 230 && Math.abs(hb.center.y - this.hy) < 260;
    if (this.state === 'idle' && near) {
      this.state = 'alert';
      this.timer = 0.9;
      c.sfx('buzz');
    } else if (this.state === 'alert' && this.timer <= 0) {
      this.state = 'swarm';
      this.timer = 5;
      c.say(this.hx, this.hy - 70, 'BZZZ !', { size: 40, color: '#FFFFFF' });
    } else if (this.state === 'swarm' && (this.timer <= 0 || !c.seen)) {
      this.state = 'rest';
      this.timer = 2.5;
    } else if (this.state === 'rest' && this.timer <= 0) this.state = 'idle';

    const shake = this.state === 'alert' ? Math.sin(c.t * 50) * 3 : 0;
    this.hive.x = this.hx + shake;
    if (this.state === 'alert') this.bang.show(this.hx, this.hy - 80, c.t);
    else this.bang.hide();

    const speed = 150 * c.mode.foe;
    let hit = false;
    for (const b of this.bees) {
      if (b.dead) continue;
      b.ang += dt * (this.state === 'alert' ? 14 : 3);
      const img = b.img;
      if (this.state === 'swarm') {
        const a = Math.atan2(hb.center.y - img.y, hb.center.x - img.x) + Math.sin(c.t * 7 + b.ang * 3) * 0.6;
        img.x += Math.cos(a) * speed * dt;
        img.y += Math.sin(a) * speed * dt;
      } else {
        const tx = this.hx + Math.cos(b.ang) * 30;
        const ty = this.hy + Math.sin(b.ang * 1.3) * 22;
        const k = Math.min(1, dt * 5);
        img.x += (tx - img.x) * k;
        img.y += (ty - img.y) * k;
      }
      img.setFlipX(Math.cos(b.ang) < 0 && this.state !== 'swarm');
      const r = rectOf(img.x - 10, img.y - 8, 20, 16);
      if (c.attacks.some((a) => overlaps(a, r)) || (this.state === 'swarm' && stomping(hero, r.y) && overlaps(c.heroRect, r))) {
        b.dead = true;
        c.burst(img.x, img.y, 4, COLORS.banana, true, 70);
        img.destroy();
        continue;
      }
      if (this.state === 'swarm' && overlaps(c.heroRect, r)) hit = true;
    }
    return hit ? 'abeilles' : null;
  }
}

// ------------------------------------------------------------------ grenouille (monde 2)

export class Frog implements Hazard {
  private img: Phaser.GameObjects.Image;
  private tongue: Phaser.GameObjects.Graphics;
  private bang: Bang;
  private state: 'idle' | 'alert' | 'tongue' | 'rest' = 'idle';
  private timer = 0;
  private dir: 1 | -1 = 1;
  private alive = true;

  constructor(scene: Phaser.Scene, private x: number, private bottom: number) {
    this.img = scene.add.image(x, bottom + 2, 'frog').setOrigin(0.5, 1).setScale(S).setDepth(15);
    this.tongue = scene.add.graphics().setDepth(14);
    this.bang = new Bang(scene);
  }

  private get body(): Rect {
    return rectOf(this.x - 26, this.bottom - 38, 52, 38);
  }

  step(dt: number, c: Ctx): DeathId | null {
    if (!this.alive) return null;
    const hb = c.hero.arcade;
    const dx = hb.center.x - this.x;
    this.timer -= dt;

    // écrasée ou frappée
    if (c.attacks.some((a) => overlaps(a, this.body)) || (overlaps(c.heroRect, this.body) && (stomping(c.hero, this.bottom - 38) || c.hero.isGiant))) {
      if (!c.attacks.length) c.hero.bounce();
      this.alive = false;
      this.tongue.clear();
      this.bang.destroy();
      squash(c.scene, this.img);
      c.sfx('stomp');
      c.say(this.x, this.bottom - 60, 'SPLOTCH !', { size: 36, color: CSS.pink });
      return null;
    }

    const warn = 0.45 + 0.55 / c.mode.foe; // petit : 1,0 s, grand : 1,0 s → on garde ça lisible
    if (this.state === 'idle') {
      this.dir = dx >= 0 ? 1 : -1;
      this.img.setFlipX(this.dir < 0);
      const inRange = c.seen && Math.abs(dx) < 250 && hb.bottom > this.bottom - 130 && hb.bottom < this.bottom + 20;
      if (inRange) {
        this.state = 'alert';
        this.timer = warn + 0.15;
        c.sfx('alert');
      }
    } else if (this.state === 'alert') {
      // la gorge gonfle
      const k = 1 + Math.sin(c.t * 14) * 0.05 + (1 - this.timer / (warn + 0.15)) * 0.18;
      this.img.setScale(S * k, S * k);
      this.bang.show(this.x, this.bottom - 62, c.t);
      if (this.timer <= 0) {
        this.state = 'tongue';
        this.timer = 0.4;
        this.bang.hide();
        this.img.setScale(S);
        c.sfx('slurp');
      }
    } else if (this.state === 'tongue') {
      // sort en 0,12 s, reste 0,16 s, rentre en 0,12 s
      const t = 0.4 - this.timer;
      const len = 240 * (t < 0.12 ? t / 0.12 : t < 0.28 ? 1 : Math.max(0, (0.4 - t) / 0.12));
      const x0 = this.x + this.dir * 24;
      const y = this.bottom - 22;
      this.tongue.clear();
      this.tongue.lineStyle(16, COLORS.ink, 1).lineBetween(x0, y, x0 + this.dir * len, y);
      this.tongue.lineStyle(10, 0xff6f91, 1).lineBetween(x0, y, x0 + this.dir * len, y);
      this.tongue.fillStyle(COLORS.ink, 1).fillCircle(x0 + this.dir * len, y, 13);
      this.tongue.fillStyle(0xff6f91, 1).fillCircle(x0 + this.dir * len, y, 9);
      const r = rectOf(Math.min(x0, x0 + this.dir * len), y - 8, Math.abs(len), 16);
      if (c.seen && overlaps(c.heroRect, r)) return 'grenouille';
      if (this.timer <= 0) {
        this.tongue.clear();
        this.state = 'rest';
        this.timer = 1.4;
      }
    } else if (this.timer <= 0) this.state = 'idle';

    // toucher le côté de la grenouille ne fait rien : seule la langue est dangereuse
    return null;
  }
}

// ------------------------------------------------------------------ escargot et armure : marcheurs

export class Snail implements Hazard {
  private img: Phaser.GameObjects.Image;
  private dir: 1 | -1 = -1;
  private alive = true;
  private wob = Math.random() * 6;

  constructor(scene: Phaser.Scene, private x: number, private bottom: number) {
    this.img = scene.add.image(x, bottom + 2, 'snail').setOrigin(0.5, 1).setScale(S).setDepth(15);
  }

  step(dt: number, c: Ctx): DeathId | null {
    if (!this.alive) return null;
    const front = this.x + this.dir * 24;
    if (c.isSolidAt(front, this.bottom - 12) || !c.isSolidAt(front, this.bottom + 4)) this.dir = this.dir > 0 ? -1 : 1;
    this.x += this.dir * 26 * c.mode.foe * dt;
    this.wob += dt;
    this.img.setPosition(this.x, this.bottom + 2).setFlipX(this.dir < 0);
    this.img.setScale(S * (1 + Math.sin(this.wob * 4) * 0.04), S * (1 - Math.sin(this.wob * 4) * 0.04));

    const body = rectOf(this.x - 22, this.bottom - 30, 44, 30);
    const struck = c.attacks.some((a) => overlaps(a, body));
    if (!struck && !overlaps(c.heroRect, body)) return null;
    if (struck || c.hero.isGiant || stomping(c.hero, body.y)) {
      if (!struck && !c.hero.isGiant) c.hero.bounce();
      this.alive = false;
      squash(c.scene, this.img);
      c.sfx('stomp');
      c.say(this.x, this.bottom - 50, 'SPLOTCH !', { size: 34, color: CSS.pink });
      return null;
    }
    return c.seen ? 'escargot' : null;
  }
}

export class Armor implements Hazard {
  private img: Phaser.GameObjects.Image;
  private bang: Bang;
  private state: 'idle' | 'alert' | 'chase' = 'idle';
  private timer = 0;
  private dir: 1 | -1 = 1;

  constructor(scene: Phaser.Scene, private x: number, private bottom: number) {
    this.img = scene.add.image(x, bottom + 2, 'armor').setOrigin(0.5, 1).setScale(S).setDepth(15);
    this.bang = new Bang(scene);
  }

  step(dt: number, c: Ctx): DeathId | null {
    const hb = c.hero.arcade;
    const dx = hb.center.x - this.x;
    const near = c.seen && Math.abs(dx) < 220 && Math.abs(hb.bottom - this.bottom) < 140;
    this.timer -= dt;
    if (this.state === 'idle') {
      if (near) {
        this.state = 'alert';
        this.timer = 0.7;
        c.sfx('clang');
      }
    } else if (this.state === 'alert') {
      this.img.x = this.x + Math.sin(c.t * 60) * 2;
      this.bang.show(this.x, this.bottom - 108, c.t);
      if (this.timer <= 0) {
        this.state = 'chase';
        this.bang.hide();
      }
    } else if (!c.seen || Math.abs(dx) > 520) {
      this.state = 'idle';
    } else {
      this.dir = dx >= 0 ? 1 : -1;
      const front = this.x + this.dir * 22;
      if (!c.isSolidAt(front, this.bottom - 20) && c.isSolidAt(front, this.bottom + 4)) this.x += this.dir * 105 * c.mode.foe * dt;
      this.img.setPosition(this.x, this.bottom + 2 - Math.abs(Math.sin(c.t * 10)) * 3);
    }
    this.img.setFlipX(this.dir < 0);
    if (this.state !== 'alert') this.img.x = this.x;

    const body = rectOf(this.x - 18, this.bottom - 80, 36, 80);
    if (!overlaps(c.heroRect, body)) return null;
    if (stomping(c.hero, this.bottom - 86)) {
      c.hero.bounce();
      c.say(this.x, this.bottom - 110, 'DING !', { size: 34, color: '#FFFFFF' });
      c.sfx('clang');
      return null;
    }
    return c.seen ? 'armure' : null;
  }
}

// ------------------------------------------------------------------ moustique géant (monde 2)

export class Mosquito implements Hazard {
  private img: Phaser.GameObjects.Image;
  private alive = true;
  private x: number;
  private dir: 1 | -1 = 1;
  private phase = Math.random() * 6;

  constructor(scene: Phaser.Scene, private x0: number, private y0: number) {
    this.x = x0;
    this.img = scene.add.image(x0, y0, 'mosquito').setScale(S).setDepth(17);
  }

  step(dt: number, c: Ctx): DeathId | null {
    if (!this.alive) return null;
    this.x += this.dir * 95 * c.mode.foe * dt;
    if (this.x > this.x0 + 170) this.dir = -1;
    if (this.x < this.x0 - 170) this.dir = 1;
    const y = this.y0 + Math.sin(c.t * 2.6 + this.phase) * 38;
    this.img.setPosition(this.x, y + Math.sin(c.t * 40) * 1.5).setFlipX(this.dir < 0);
    const body = rectOf(this.x - 24, y - 16, 48, 32);
    const struck = c.attacks.some((a) => overlaps(a, body));
    if (!struck && !overlaps(c.heroRect, body)) return null;
    if (struck || c.hero.isGiant || stomping(c.hero, body.y)) {
      if (!struck && !c.hero.isGiant) c.hero.bounce();
      this.alive = false;
      c.burst(this.x, y, 6, 0xc23b3b, true, 90);
      this.img.destroy();
      c.sfx('stomp');
      c.say(this.x, y - 40, 'SPLAF !', { size: 34, color: CSS.pink });
      return null;
    }
    return c.seen ? 'moustique' : null;
  }
}

// ------------------------------------------------------------------ porte qui est une bouche (monde 3)

export class MouthDoor implements Hazard {
  private img: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, private x: number, private bottom: number) {
    this.img = scene.add.image(x, bottom + 2, 'door').setOrigin(0.5, 1).setScale(S).setDepth(5);
  }

  step(_dt: number, c: Ctx): DeathId | null {
    const dx = Math.abs(c.hero.arcade.center.x - this.x);
    // La porte « respire » : quand le héros approche, elle ouvre un instant la bouche (indice !)
    const peek = dx < 190 && Math.floor(c.t * 3) % 2 === 0;
    this.img.setTexture(peek ? 'doorMouth' : 'door').setScale(S);
    if (peek) this.img.x = this.x + Math.sin(c.t * 40) * 1.2;
    const body = rectOf(this.x - 24, this.bottom - 90, 48, 90);
    if (overlaps(c.heroRect, body)) {
      this.img.setTexture('doorMouth');
      return 'porte';
    }
    return null;
  }
}

// ------------------------------------------------------------------ coffre qui mord (monde 4)

export class MimicChest implements Hazard {
  private img: Phaser.GameObjects.Image;
  private bang: Bang;
  private state: 'idle' | 'wiggle' | 'bite' | 'rest' = 'idle';
  private timer = 0;

  constructor(scene: Phaser.Scene, private x: number, private bottom: number) {
    this.img = scene.add.image(x, bottom + 2, 'chest').setOrigin(0.5, 1).setScale(S).setDepth(15);
    this.bang = new Bang(scene);
  }

  step(dt: number, c: Ctx): DeathId | null {
    const hb = c.hero.arcade;
    const dx = Math.abs(hb.center.x - this.x);
    const near = c.seen && dx < 120 && Math.abs(hb.bottom - this.bottom) < 90;
    this.timer -= dt;
    if (this.state === 'idle' && near) {
      this.state = 'wiggle';
      this.timer = 0.9;
      c.sfx('alert');
    } else if (this.state === 'wiggle') {
      // le coffre tremble : ce n'est pas un vrai coffre
      this.img.setAngle(Math.sin(c.t * 40) * 5);
      this.bang.show(this.x, this.bottom - 70, c.t);
      if (this.timer <= 0) {
        this.state = 'bite';
        this.timer = 0.5;
        this.bang.hide();
        this.img.setAngle(0).setTexture('mimic').setScale(S);
        c.sfx('chomp');
        c.say(this.x, this.bottom - 90, 'CHOMP !', { size: 40 });
      }
    } else if (this.state === 'bite') {
      const jaws = rectOf(this.x - 52, this.bottom - 64, 104, 64);
      if (c.seen && overlaps(c.heroRect, jaws)) return 'coffre';
      if (this.timer <= 0) {
        this.state = 'rest';
        this.timer = 1.6;
        this.img.setTexture('chest').setScale(S);
      }
    } else if (this.state === 'rest' && this.timer <= 0) this.state = 'idle';
    return null;
  }
}

// ------------------------------------------------------------------ stalactite (monde 3)

export class Stalactite implements Hazard {
  private img: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private state: 'idle' | 'shake' | 'fall' | 'done' = 'idle';
  private timer = 0;
  private vy = 0;

  constructor(scene: Phaser.Scene, private x: number, private top: number, private groundY: number) {
    this.img = scene.add.image(x, top, 'stalactite').setOrigin(0.5, 0).setScale(S).setDepth(6);
    this.shadow = scene.add.ellipse(x, groundY - 2, 10, 6, COLORS.ink, 0.28).setDepth(3).setVisible(false);
  }

  step(dt: number, c: Ctx): DeathId | null {
    if (this.state === 'done') return null;
    const hb = c.hero.arcade;
    if (this.state === 'idle') {
      if (Math.abs(hb.center.x - this.x) < 120 && hb.bottom > this.top) {
        this.state = 'shake';
        this.timer = Math.max(0.7, c.mode.anvilWarn);
        this.shadow.setVisible(true);
        c.sfx('cling');
      }
      return null;
    }
    if (this.state === 'shake') {
      this.img.x = this.x + Math.sin(c.t * 70) * 2.5;
      const k = 1 - this.timer / Math.max(0.7, c.mode.anvilWarn);
      this.shadow.setSize(14 + k * 50, 8 + k * 8);
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'fall';
        this.vy = 0;
        this.img.x = this.x;
      }
      return null;
    }
    // chute
    this.vy = Math.min(this.vy + 1900 * dt, 1100);
    this.img.y += this.vy * dt;
    const r = rectOf(this.x - 12, this.img.y + 6, 24, this.img.displayHeight - 6);
    const bottom = this.img.y + this.img.displayHeight;
    if (overlaps(c.heroRect, r)) return 'stalactite';
    if (bottom >= this.groundY) {
      this.state = 'done';
      this.shadow.destroy();
      c.sfx('cling');
      c.shake(200, 0.008);
      c.say(this.x, this.groundY - 80, 'CLING !', { size: 40, color: '#CDEEFF' });
      c.burst(this.x, this.groundY - 10, 8, 0xcdeeff, false, 120);
      this.img.destroy();
    }
    return null;
  }
}

// ------------------------------------------------------------------ tireurs : bonhomme de neige et dragon

interface ShooterKind {
  tex: string;
  ball: string;
  death: DeathId;
  /** Hauteur de la bouche au-dessus du sol. */
  mouth: number;
  speed: number;
  every: number;
  shout: string;
  stunColor: number;
}

const KINDS: Record<'snowman' | 'dragon', ShooterKind> = {
  snowman: { tex: 'snowman', ball: 'snowball', death: 'neige', mouth: 30, speed: 235, every: 3.4, shout: 'ATCHOUM !', stunColor: 0x9ec8ff },
  dragon: { tex: 'dragon', ball: 'fireball', death: 'dragon', mouth: 34, speed: 265, every: 3.0, shout: 'ATCHAAA !', stunColor: 0xa8c0ff },
};

export class Shooter implements Hazard, Target {
  private img: Phaser.GameObjects.Image;
  private bang: Bang;
  private kind: ShooterKind;
  private state: 'idle' | 'alert' | 'rest' | 'stun' = 'idle';
  private timer = 1.2;
  private dir: 1 | -1 = -1;

  constructor(scene: Phaser.Scene, kind: 'snowman' | 'dragon', private x: number, private bottom: number) {
    this.kind = KINDS[kind];
    this.img = scene.add.image(x, bottom + 2, this.kind.tex).setOrigin(0.5, 1).setScale(S).setDepth(15);
    this.bang = new Bang(scene);
  }

  get rect(): Rect {
    return rectOf(this.x - 26, this.bottom - this.img.displayHeight, 52, this.img.displayHeight);
  }

  canBeHurt(): boolean {
    return this.state !== 'stun';
  }

  hurt(c: Ctx): void {
    c.say(this.x, this.bottom - this.img.displayHeight - 10, 'FLOUF !', { size: 34, color: '#FFFFFF' });
    this.state = 'stun';
    this.timer = 4;
    this.img.setTint(this.kind.stunColor);
    this.bang.hide();
    this.img.setScale(S);
  }

  step(dt: number, c: Ctx): DeathId | null {
    const hb = c.hero.arcade;
    const dx = hb.center.x - this.x;
    this.timer -= dt;
    if (this.state !== 'alert' || this.timer > 0) this.img.x = this.x;
    // on peut aussi lui sauter sur la tête : DING !
    if (overlaps(c.heroRect, this.rect) && stomping(c.hero, this.bottom - this.img.displayHeight)) {
      c.hero.bounce();
      c.sfx('pop');
    }
    if (this.state === 'stun') {
      this.img.setAngle(Math.sin(c.t * 8) * 6);
      if (this.timer <= 0) {
        this.state = 'rest';
        this.timer = 1;
        this.img.clearTint().setAngle(0);
      }
      return null;
    }
    this.dir = dx >= 0 ? 1 : -1;
    this.img.setFlipX(this.dir < 0);
    if (this.state === 'idle' || this.state === 'rest') {
      if (this.state === 'rest' && this.timer <= 0) this.state = 'idle';
      const warnTime = Math.max(0.7, 1.6 - c.mode.foe * 0.6);
      if (this.state === 'idle' && c.seen && Math.abs(dx) < 430 && Math.abs(dx) > 40 && Math.abs(hb.bottom - this.bottom) < 140 && this.timer <= 0) {
        this.state = 'alert';
        this.timer = warnTime;
        c.sfx('alert');
      }
    } else if (this.state === 'alert') {
      // il gonfle, il tremble : il va éternuer
      const total = Math.max(0.7, 1.6 - c.mode.foe * 0.6);
      const k = 1 + (1 - this.timer / total) * 0.2;
      this.img.setScale(S * k, S * k).x = this.x + Math.sin(c.t * 55) * 2;
      this.bang.show(this.x, this.bottom - this.img.displayHeight - 22, c.t);
      if (this.timer <= 0) {
        this.state = 'rest';
        this.timer = this.kind.every / c.mode.foe;
        this.img.setScale(S).x = this.x;
        this.bang.hide();
        c.projectiles.push(
          new Projectile(c.scene, this.kind.ball, this.x + this.dir * 34, this.bottom - this.kind.mouth, this.dir * this.kind.speed * c.mode.foe, this.kind.death, { reflectable: true, r: 15 }),
        );
        c.sfx('sneeze');
        c.say(this.x, this.bottom - this.img.displayHeight - 30, this.kind.shout, { size: 34, color: '#FFFFFF' });
      }
    }
    return null;
  }
}
