// Messire Paulochon : déplacement, saut (coyote time + mémoire du saut + saut court),
// mode Géant, vol (potion Plume), glissade (peau de banane) et épée en bois.

import Phaser from 'phaser';
import { COLORS, PHYSICS, SPRITE_RES } from '../config';
import type { ControlState } from '../systems/Controls';

const BASE_SCALE = 1 / SPRITE_RES;
const GIANT_SCALE = 2 / SPRITE_RES;
// Boîte de collision dans le repère de la texture (rasterisée à 2×).
const BODY_W = 60;
const BODY_H = 104;
const BODY_OFFSET_X = 14; // le corps n'est pas centré : le manche de la casserole dépasse à droite
const BODY_OFFSET_Y = 24;

// Réglages repris du prototype
const SLIDE_SPEED = 430;
const SLIDE_TIME = 1.3;
/** Après la glissade, tomber dans un trou compte encore comme « peau de banane ». */
const BANANA_GRACE = 2.6;
const FLY_GRAVITY = 950;
const FLY_THRUST = 2700;
const FLY_MAX_UP = 360;
const ATTACK_TIME = 0.22;
const ATTACK_COOLDOWN = 0.32;
const TINY_SCALE = 0.55 / SPRITE_RES;
/** Sur la glace, le héros accélère et freine très mollement. */
const ICE_ACCEL = 330;

export type Tool = 'sword' | 'pan' | 'boomerang';

/** Hauteur (px de jeu) du héros normal à l'écran ; sert à placer l'épée et les ailes. */
const DISPLAY_H = 66;
const DISPLAY_W = DISPLAY_H * (274 / 330);
const SWORD_DISPLAY_H = DISPLAY_H * 0.62;

const approach = (v: number, target: number, delta: number) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));

export class Hero extends Phaser.Physics.Arcade.Sprite {
  face: 1 | -1 = 1;
  speed: number;
  giantTime = 0;
  flyTime = 0;
  slideTime = 0;
  slideDir: 1 | -1 = 1;
  bananaTime = 0;
  tinyTime = 0;
  ghostTime = 0;
  /** Outil en main : épée en bois, poêle à frire ou boomerang (le dernier ramassé remplace l'autre). */
  tool: Tool | null = null;
  /** Lancé par un champignon : le saut court ne coupe pas l'élan tant qu'on monte. */
  private launched = false;
  /** Vrai quand le héros est posé sur de la glace (réglé par la scène à chaque image). */
  onIce = false;
  /** Tant que ce test renvoie faux, la potion Minus ne finit pas (on ne ressort pas coincé dans la roche). */
  canGrow: () => boolean = () => true;
  private coyote = 0;
  private jumpBuf = 0;
  private walkT = 0;
  private attackT = 0;
  private attackCd = 0;
  private sword: Phaser.GameObjects.Image;
  private swing: Phaser.GameObjects.Graphics;
  private wings: Phaser.GameObjects.Ellipse[];

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number) {
    super(scene, x, y, 'hero');
    this.speed = speed;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setScale(BASE_SCALE).setDepth(20);
    this.arcade.setSize(BODY_W, BODY_H).setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);
    // Vers le haut on peut dépasser (champignons rebondissants) ; la chute, elle, est plafonnée dans step().
    this.arcade.setMaxVelocity(1000, 2200);
    this.setCollideWorldBounds(true);

    this.sword = scene.add.image(x, y, 'sword').setOrigin(0.5, 0.87).setDepth(21).setVisible(false);
    this.swing = scene.add.graphics().setDepth(22);
    this.wings = [0, 1].map(() => scene.add.ellipse(x, y, 10, 10, 0xffffff).setStrokeStyle(3, COLORS.ink).setDepth(19).setVisible(false));
  }

  get arcade(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get hasSword(): boolean {
    return this.tool === 'sword';
  }

  set hasSword(v: boolean) {
    if (v) this.tool = 'sword';
    else if (this.tool === 'sword') this.tool = null;
  }

  get isTiny(): boolean {
    return this.tinyTime > 0;
  }

  get isGhost(): boolean {
    return this.ghostTime > 0;
  }

  /** Potion Minus : tout petit, on passe dans les trous d'une case. */
  makeTiny(duration: number): void {
    this.tinyTime = duration;
    this.setScale(TINY_SCALE);
  }

  /** Potion Fantôme : invisible pour les monstres. */
  makeGhost(duration: number): void {
    this.ghostTime = duration;
  }

  /** Toutes les potions s'arrêtent (on en boit une nouvelle) : taille normale, plus de vol, plus fantôme. */
  clearPotions(): void {
    this.giantTime = 0;
    this.tinyTime = 0;
    this.ghostTime = 0;
    if (this.flyTime > 0) this.emit('flyEnd');
    this.flyTime = 0;
    this.arcade.setGravityY(0);
    this.setScale(BASE_SCALE);
    this.setAlpha(1);
  }

  /** Choisit l'outil en main : épée, poêle ou boomerang (null = rien). */
  setTool(tool: Tool | null): void {
    this.tool = tool;
    this.sword.setTexture(tool === 'pan' ? 'pan' : 'sword');
    if (tool === 'pan') this.sword.setOrigin(0.94, 0.5);
    else this.sword.setOrigin(0.5, 0.87);
  }

  get isGiant(): boolean {
    return this.giantTime > 0;
  }

  get onGround(): boolean {
    return this.arcade.blocked.down || this.arcade.touching.down;
  }

  makeGiant(duration: number): void {
    this.giantTime = duration;
    this.setScale(GIANT_SCALE);
  }

  /** Potion Plume : gravité réduite, on monte en gardant SAUT appuyé. */
  makeFly(duration: number): void {
    this.flyTime = duration;
    this.arcade.setGravityY(FLY_GRAVITY - PHYSICS.gravity);
  }

  /** Peau de banane : glissade forcée dans la direction de course. */
  startSlide(dir: 1 | -1): void {
    this.slideTime = SLIDE_TIME;
    this.slideDir = dir;
    this.bananaTime = BANANA_GRACE;
  }

  /** Boîte de collision actuelle (pour les tests de recouvrement « à la main »). */
  get rect(): Phaser.Geom.Rectangle {
    const b = this.arcade;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  /** À appeler à chaque image. `dt` en secondes. Émet 'jump', 'shrink' et 'flyEnd'. */
  step(dt: number, c: ControlState): void {
    const b = this.arcade;
    const grounded = this.onGround;

    if (this.giantTime > 0) {
      this.giantTime -= dt;
      if (this.giantTime <= 0) {
        this.giantTime = 0;
        this.setScale(BASE_SCALE);
        this.emit('shrink');
      }
    }
    if (this.tinyTime > 0) {
      this.tinyTime -= dt;
      if (this.tinyTime <= 0) {
        if (this.canGrow()) {
          this.tinyTime = 0;
          this.setScale(BASE_SCALE);
          this.emit('grow');
        } else {
          this.tinyTime = 0.05; // pas la place pour grandir : on attend d'être sorti du tunnel
        }
      }
    }
    if (this.ghostTime > 0) {
      this.ghostTime -= dt;
      if (this.ghostTime <= 0) {
        this.ghostTime = 0;
        this.emit('ghostEnd');
      }
    }
    this.setAlpha(this.ghostTime > 0 ? (this.ghostTime < 2 && Math.floor(this.ghostTime * 8) % 2 ? 0.8 : 0.45) : 1);
    if (this.flyTime > 0) {
      this.flyTime -= dt;
      if (this.flyTime <= 0) {
        this.flyTime = 0;
        b.setGravityY(0);
        this.emit('flyEnd');
      }
    }
    if (this.bananaTime > 0) this.bananaTime -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.attackT > 0) this.attackT -= dt;

    // Course (ou glissade forcée)
    const sliding = this.slideTime > 0;
    const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
    if (sliding) {
      this.slideTime -= dt;
      b.setVelocityX(this.slideDir * SLIDE_SPEED);
    } else {
      const target = dir * this.speed * (this.isGiant ? 1.05 : 1);
      const accel = grounded ? (this.onIce ? ICE_ACCEL : 2600) : 1800;
      b.setVelocityX(approach(b.velocity.x, target, accel * dt));
      if (dir !== 0 && dir !== this.face) {
        this.face = dir as 1 | -1;
        this.setFlipX(this.face < 0);
        b.setOffset(this.face < 0 ? this.width - BODY_W - BODY_OFFSET_X : BODY_OFFSET_X, BODY_OFFSET_Y);
      }
    }

    // Saut
    this.coyote = grounded ? PHYSICS.coyoteTime : this.coyote - dt;
    this.jumpBuf = c.jumpPressed ? PHYSICS.jumpBuffer : this.jumpBuf - dt;
    if (this.jumpBuf > 0 && this.coyote > 0 && !sliding) {
      b.setVelocityY(-PHYSICS.jumpVelocity);
      this.jumpBuf = 0;
      this.coyote = 0;
      this.emit('jump');
    }
    if (this.flyTime > 0) {
      if (c.jump && !grounded) b.setVelocityY(Math.max(b.velocity.y - FLY_THRUST * dt, -FLY_MAX_UP));
    } else if (!this.launched && !c.jump && b.velocity.y < -PHYSICS.jumpCutVelocity) {
      b.setVelocityY(-PHYSICS.jumpCutVelocity);
    }

    // Petit dandinement en marchant, penché en l'air, couché en glissant
    if (sliding) {
      this.setRotation(this.slideDir * (0.5 + Math.sin(this.scene.time.now / 1000 * 30) * 0.1));
    } else if (grounded && Math.abs(b.velocity.x) > 20) {
      this.walkT += dt;
      this.setAngle(Math.sin(this.walkT * 14) * 4);
    } else if (!grounded) {
      this.setAngle((b.velocity.y < 0 ? -3 : 3) * this.face);
    } else {
      this.setAngle(0);
    }

    if (b.velocity.y > PHYSICS.maxFall) b.setVelocityY(PHYSICS.maxFall);
    if (b.velocity.y >= 0) this.launched = false;
    this.syncAccessories();
  }

  bounce(): void {
    this.arcade.setVelocityY(-PHYSICS.stompBounce);
  }

  /** Grand bond (champignon) : on monte jusqu'au bout, même si on lâche SAUT. */
  launch(vy: number): void {
    this.arcade.setVelocityY(-vy);
    this.launched = true;
  }

  // ------------------------------------------------------------------ épée

  /** Lance un coup d'épée / de poêle ou un boomerang. Renvoie 'swing', 'throw', 'nosword' (rien en main) ou null (trop tôt). */
  tryAttack(): 'swing' | 'throw' | 'nosword' | null {
    if (this.attackCd > 0) return null;
    if (!this.tool) {
      this.attackCd = 0.9;
      return 'nosword';
    }
    this.attackCd = ATTACK_COOLDOWN;
    if (this.tool === 'boomerang') {
      this.attackCd = 0.5;
      return 'throw';
    }
    this.attackT = ATTACK_TIME;
    return 'swing';
  }

  /** Zone touchée par l'épée pendant un coup (null sinon). */
  attackBox(): Phaser.Geom.Rectangle | null {
    if (this.attackT <= 0) return null;
    const b = this.arcade;
    const w = (this.isGiant ? 84 : this.tool === 'pan' ? 62 : 48) * (this.isTiny ? 0.9 : 1);
    return new Phaser.Geom.Rectangle(this.face > 0 ? b.right - 4 : b.left - w + 4, b.top + b.height * 0.1, w, b.height * 0.75);
  }

  // ------------------------------------------------------------------ accessoires (épée, ailes)

  /** Cache l'épée, les ailes et l'arc du coup : à la mort, le héros n'a plus rien en main. */
  hideAccessories(): void {
    this.sword.setVisible(false);
    this.swing.clear();
    this.wings.forEach((w) => w.setVisible(false));
  }

  private syncAccessories(): void {
    const s = this.scaleY * SPRITE_RES; // 1 = normal, 2 = géant, 0,55 = minus
    const b = this.arcade;
    const t = this.scene.time.now / 1000;

    // Épée dans la main (la main est à droite du centre du sprite, miroir si le héros regarde à gauche)
    this.swing.clear();
    const held = this.tool === 'sword' || this.tool === 'pan';
    this.sword.setVisible(held);
    if (held) {
      const hx = this.x + this.face * 0.2295 * DISPLAY_W * s;
      const hy = this.y - 0.2545 * DISPLAY_H * s;
      let ang = 0.35;
      if (this.attackT > 0) ang = -0.7 + (1 - this.attackT / ATTACK_TIME) * 2.6;
      if (this.tool === 'pan') {
        // la poêle se tient debout : tête en haut, manche dans la main
        this.sword.setFlipX(this.face < 0).setOrigin(this.face < 0 ? 0.06 : 0.94, 0.5);
        this.sword.setPosition(hx, hy).setRotation(this.face * (Math.PI / 2 + ang * 0.7));
      } else {
        this.sword.setPosition(hx, hy).setRotation(ang * this.face);
      }
      if (this.tool === 'pan') this.sword.setScale((SWORD_DISPLAY_H * 1.15 * s) / this.sword.width);
      else this.sword.setScale((SWORD_DISPLAY_H * s) / this.sword.height);
      if (this.attackT > 0) {
        const r = SWORD_DISPLAY_H * s * 0.85;
        this.swing.lineStyle(6, 0xffffff, 0.85).beginPath();
        if (this.face > 0) this.swing.arc(hx, hy, r, -1.9, 0.9);
        else this.swing.arc(hx, hy, r, Math.PI - 0.9, Math.PI + 1.9);
        this.swing.strokePath();
      }
    }

    // Ailes qui battent
    const flying = this.flyTime > 0;
    const h = DISPLAY_H * s;
    const w = DISPLAY_W * s;
    const flap = Math.sin(t * 26) * 0.5;
    this.wings.forEach((wing, i) => {
      wing.setVisible(flying);
      if (!flying) return;
      const side = i === 0 ? -1 : 1;
      const a = side * (0.4 + flap);
      const px = b.center.x + side * w * 0.12;
      const py = this.y - h * 0.55;
      wing.setSize(w * 0.68, h * 0.24);
      wing.setPosition(px + side * w * 0.32 * Math.cos(a), py + side * w * 0.32 * Math.sin(a));
      wing.setRotation(a);
    });
  }
}
