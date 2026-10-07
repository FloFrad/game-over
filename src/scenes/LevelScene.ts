// Scène de jeu : construit le niveau depuis la carte ASCII, gère le héros, les monstres,
// les objets, les pièges, les morts (→ album) et la victoire.
//
// v0.2 : épée en bois, peau de banane, enclumes, potion Plume + oiseau, Ronchon, bulle de la princesse,
// sons, pause. Comportements et réglages repris de docs/prototype/niveau-1-prototype.html.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_HEIGHT, GAME_WIDTH, MODES, SPRITE_RES, TILE, type Mode } from '../config';
import { DEATH_BY_ID, type DeathId } from '../data/deaths';
import { LEVEL_1 } from '../levels/level1';
import { parseLevel, TILE_CRATE, TILE_EMPTY, TILE_GROUND, TILE_PLANK, type ParsedLevel } from '../levels/types';
import { Anvil } from '../objects/Anvil';
import { Bird } from '../objects/Bird';
import { Gloumpf } from '../objects/Gloumpf';
import { Hero } from '../objects/Hero';
import { album } from '../systems/album';
import { Controls } from '../systems/Controls';
import { sound } from '../systems/sound';
import { Hud } from '../ui/Hud';
import { SpeechBubble } from '../ui/speech';
import { addTouchControls } from '../ui/TouchControls';
import { comicText } from '../ui/comicText';
import { openAlbum } from './AlbumScene';

interface Checkpoint {
  x: number;
  flag?: Phaser.GameObjects.Image;
  on: boolean;
}

type PickupKind = 'sword' | 'giant' | 'plume';

interface Pickup {
  kind: PickupKind;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  rect: Phaser.Geom.Rectangle;
  taken: boolean;
  /** Temps écoulé depuis la prise (les potions réapparaissent au bout de 2 s). */
  rt: number;
}

interface Peel {
  img: Phaser.GameObjects.Image;
  rect: Phaser.Geom.Rectangle;
  used: boolean;
}

interface AnvilTrigger {
  x: number;
  /** Décalage devant le héros : la 1re enclume tombe sur lui, la 2e un peu devant. */
  offset: number;
  fired: boolean;
}

const S = 1 / SPRITE_RES;
const ANVIL_OFFSETS = [0, 170];
const SWORD_HITS = 4;
/** Délai entre la mort et la case de BD (le fantôme est en train de monter). */
const DEATH_DELAY = 1000;

const overlap = Phaser.Geom.Rectangle.Overlaps;
const bodyRect = (b: Phaser.Physics.Arcade.Body) => new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);

export class LevelScene extends Phaser.Scene {
  private level!: ParsedLevel;
  private hero!: Hero;
  private controls!: Controls;
  private hud!: Hud;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private planks!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private gloumpfs: Gloumpf[] = [];
  private checkpoints: Checkpoint[] = [];
  private pickups: Pickup[] = [];
  private peels: Peel[] = [];
  private anvilTriggers: AnvilTrigger[] = [];
  private anvils: Anvil[] = [];
  private bird!: Bird;
  private princess?: Phaser.GameObjects.Image;
  private princessY = 0;
  private bubble?: SpeechBubble;
  private ronchon?: Phaser.GameObjects.Image;
  private ronchonBox?: Phaser.Geom.Rectangle;
  private zzz: Phaser.GameObjects.Text[] = [];
  private hillsFar!: Phaser.GameObjects.TileSprite;
  private hillsNear!: Phaser.GameObjects.TileSprite;
  private ended = false;
  private crackCooldown = 0;
  private swordHits = 0;
  private deathId?: DeathId;
  private dyingT = 0;
  private dyingVx = 0;
  private dyingVy = 0;

  constructor() {
    super('Level');
  }

  private get mode(): Mode {
    return (this.registry.get('mode') as Mode) ?? 'petit';
  }

  init(data: { fromCheckpoint?: boolean }): void {
    if (!data?.fromCheckpoint) {
      this.registry.set('checkpoint', 0);
      this.registry.set('hasSword', false);
      this.registry.set('swordHits', 0);
    }
    this.ended = false;
    this.gloumpfs = [];
    this.checkpoints = [];
    this.pickups = [];
    this.peels = [];
    this.anvilTriggers = [];
    this.anvils = [];
    this.zzz = [];
    this.ronchon = undefined;
    this.ronchonBox = undefined;
    this.princess = undefined;
    this.bubble = undefined;
    this.deathId = undefined;
    this.crackCooldown = 0;
    this.dyingT = 0;
  }

  create(): void {
    this.level = parseLevel(LEVEL_1);
    const worldW = this.level.cols * TILE;
    const settings = MODES[this.mode];

    this.physics.world.setBounds(0, -400, worldW, GAME_HEIGHT + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBackgroundColor(CSS.sky).setBounds(0, 0, worldW, GAME_HEIGHT);

    this.buildBackground(worldW);
    this.buildTiles();
    this.buildEntities();
    this.bird = new Bird(this);

    // Héros au dernier drapeau atteint
    const cpIndex = Math.min(this.registry.get('checkpoint') ?? 0, this.checkpoints.length - 1);
    this.checkpoints.forEach((cp, i) => {
      cp.on = i <= cpIndex;
      cp.flag?.setTexture(cp.on ? 'flag-on' : 'flag-off');
    });
    const start = this.checkpoints[cpIndex];
    this.hero = new Hero(this, start.x + TILE / 2, this.groundY() - 1, settings.heroSpeed);
    this.hero.hasSword = this.registry.get('hasSword') === true;
    this.swordHits = this.registry.get('swordHits') ?? 0;
    this.hero.on('jump', () => sound.play('jump'));
    this.hero.on('shrink', () => this.onShrink());
    this.hero.on('flyEnd', () => this.onFlyEnd());
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);

    // Collisions
    this.physics.add.collider(this.hero, this.solids);
    this.physics.add.collider(this.hero, this.planks);
    this.physics.add.collider(this.hero, this.crates);
    for (const g of this.gloumpfs) {
      this.physics.add.collider(g, this.solids);
      this.physics.add.collider(g, this.planks);
      this.physics.add.collider(g, this.crates);
      this.physics.add.overlap(this.hero, g, () => this.touchGloumpf(g));
    }

    // Entrées + HUD
    this.controls = new Controls(this);
    addTouchControls(this, this.controls);
    this.hud = new Hud(this, {
      title: `NIVEAU ${this.level.data.id} · ${this.level.data.name}`,
      onPause: () => this.pauseGame(),
      onAlbum: () => this.openAlbumOverlay(),
    });
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    this.input.keyboard?.on('keydown-P', () => this.pauseGame());

    // Après une pause, les touches relâchées pendant ce temps ne sont pas vues : on les remet à zéro.
    const onResume = () => {
      this.controls.resetKeys();
      this.hud.refreshAlbum();
    };
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => this.events.off('resume', onResume));
  }

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const t = time / 1000;
    this.hillsFar.tilePositionX = this.cameras.main.scrollX * 0.15;
    this.hillsNear.tilePositionX = this.cameras.main.scrollX * 0.38;
    this.updateAmbient(t);
    if (this.ended) {
      this.updateDying(dt);
      return;
    }
    if (this.crackCooldown > 0) this.crackCooldown -= dt;

    const c = this.controls.read();
    this.hero.step(dt, c);
    if (c.attackPressed) this.attack();
    for (const g of this.gloumpfs) g.step(dt);

    const hero = this.hero;
    const body = hero.arcade;
    if (hero.y > GAME_HEIGHT + 120) return this.die(hero.bananaTime > 0 || hero.slideTime > 0 ? 'banane' : 'plongeon');
    if (hero.flyTime > 0 && body.top < 62) return this.die('oiseau');
    if (hero.isGiant) {
      this.smashCratesAround();
      if ((body.blocked.up || body.touching.up) && this.ceilingAbove()) return this.die('bonk');
    }

    const atk = hero.attackBox();
    if (atk) this.swordStrikes(atk);
    this.updatePickups(dt);
    this.updatePeels();

    // Le Ronchon : le toucher (ou le taper) le réveille
    if (this.ronchonBox && (overlap(hero.rect, this.ronchonBox) || (atk && overlap(atk, this.ronchonBox)))) return this.die('ronchon');

    // Enclumes : chaque déclencheur lâche une enclume quand le héros passe
    for (const trig of this.anvilTriggers) {
      if (!trig.fired && body.left > trig.x) {
        trig.fired = true;
        const warn = MODES[this.mode].anvilWarn;
        this.anvils.push(new Anvil(this, body.center.x + trig.offset * hero.face, this.groundY(), warn));
        sound.play('whistle', warn);
      }
    }
    for (const a of this.anvils) {
      if (a.step(dt) === 'landed') this.onAnvilLanded(a);
      if (a.lethal && overlap(hero.rect, a.rect)) return this.die('enclume');
    }
    this.anvils = this.anvils.filter((a) => {
      if (a.state !== 'done') return true;
      a.destroy();
      return false;
    });

    // Drapeaux
    this.checkpoints.forEach((cp, i) => {
      if (!cp.on && hero.x > cp.x + 20) {
        cp.on = true;
        cp.flag?.setTexture('flag-on');
        this.registry.set('checkpoint', Math.max(i, this.registry.get('checkpoint') ?? 0));
        sound.play('flag');
        comicText(this, cp.x + 20, this.groundY() - 130, 'DRAPEAU !', { size: 30, color: '#FFFFFF' });
      }
    });

    // Princesse = fin du niveau
    if (this.princess) {
      this.bubble?.setVisible(Math.abs(hero.x - this.princess.x) < 380);
      if (hero.x > this.princess.x - 40) return this.win();
    }

    // Oiseau affamé : il arrive dès qu'on vole
    if (hero.flyTime > 0 && !this.bird.active) this.bird.start();
    this.bird.step(dt, this.cameras.main.scrollX, t);

    this.hud.update({
      giant: hero.isGiant ? hero.giantTime / MODES[this.mode].giantDuration : null,
      fly: hero.flyTime > 0 ? hero.flyTime / MODES[this.mode].flyDuration : null,
      swordLeft: hero.hasSword ? SWORD_HITS - this.swordHits : null,
    });
  }

  // ------------------------------------------------------------------ construction

  private groundY(): number {
    // La ligne du sol « normal » : haut de la rangée 10 dans les cartes à 12 rangées.
    return (this.level.rows - 2) * TILE;
  }

  private tileAt(col: number, row: number): number {
    if (row < 0 || row >= this.level.rows) return TILE_EMPTY;
    if (col < 0 || col >= this.level.cols) return TILE_GROUND;
    return this.level.grid[row][col];
  }

  private isSolidAt = (x: number, y: number): boolean => this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)) !== TILE_EMPTY;

  private buildBackground(worldW: number): void {
    this.add.image(840, 96, 'sun').setScrollFactor(0).setDepth(-10);
    for (let x = 80; x < worldW * 0.25 + GAME_WIDTH; x += 380) {
      this.add.image(x, 70 + ((x * 7) % 70), 'cloud').setScrollFactor(0.2).setDepth(-9);
    }
    this.hillsFar = this.add.tileSprite(0, 200, GAME_WIDTH, 300, 'hills-far').setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.hillsNear = this.add.tileSprite(0, 250, GAME_WIDTH, 300, 'hills-near').setOrigin(0).setScrollFactor(0).setDepth(-7);
    for (const c of this.level.data.trees) {
      this.add.image(c * TILE + 20, this.groundY() + 2, 'tree').setOrigin(0.5, 1).setDepth(-5).setScale(0.85 + ((c * 37) % 5) * 0.08);
    }
    const water = this.add.graphics().setDepth(-1);
    for (const w of this.level.water) {
      water.fillStyle(COLORS.water, 1).fillRect(w.col * TILE, w.row * TILE - 20, TILE, GAME_HEIGHT);
    }
  }

  private buildTiles(): void {
    this.solids = this.physics.add.staticGroup();
    this.planks = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    const outline = this.add.graphics().setDepth(2);
    outline.lineStyle(4, COLORS.ink, 1);

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        const t = this.level.grid[r][c];
        const x = c * TILE, y = r * TILE;
        if (t === TILE_GROUND) {
          const top = r > 0 && this.tileAt(c, r - 1) !== TILE_GROUND;
          (this.solids.create(x + TILE / 2, y + TILE / 2, top ? 'tile-ground-top' : 'tile-ground') as Phaser.GameObjects.Image).setDepth(1);
          if (r > 0 && this.tileAt(c, r - 1) !== TILE_GROUND) outline.lineBetween(x, y, x + TILE, y);
          if (r < this.level.rows - 1 && this.tileAt(c, r + 1) !== TILE_GROUND) outline.lineBetween(x, y + TILE, x + TILE, y + TILE);
          if (c > 0 && this.level.grid[r][c - 1] !== TILE_GROUND) outline.lineBetween(x, y, x, y + TILE);
          if (c < this.level.cols - 1 && this.level.grid[r][c + 1] !== TILE_GROUND) outline.lineBetween(x + TILE, y, x + TILE, y + TILE);
        } else if (t === TILE_PLANK) {
          const p = this.planks.create(x + TILE / 2, y + 8, 'tile-plank') as Phaser.Physics.Arcade.Image;
          const pb = p.body as Phaser.Physics.Arcade.StaticBody;
          pb.checkCollision.down = false;
          pb.checkCollision.left = false;
          pb.checkCollision.right = false;
        } else if (t === TILE_CRATE) {
          (this.crates.create(x + TILE / 2, y + TILE / 2, 'tile-crate') as Phaser.GameObjects.Image).setDepth(1);
        }
      }
    }
  }

  private buildEntities(): void {
    const gy = this.groundY();
    const gloumpfSpeed = MODES[this.mode].gloumpfSpeed;
    const start = this.level.entities.find((e) => e.type === '@');
    this.checkpoints.push({ x: (start?.col ?? 1) * TILE, on: true });
    let anvilCount = 0;

    for (const e of this.level.entities) {
      const x = e.col * TILE + TILE / 2;
      const bottom = (e.row + 1) * TILE;
      switch (e.type) {
        case 'K':
          this.checkpoints.push({ x: e.col * TILE, on: false, flag: this.add.image(e.col * TILE + 20, gy, 'flag-off').setOrigin(0.12, 1).setDepth(3) });
          break;
        case 'G':
          this.gloumpfs.push(new Gloumpf(this, x, bottom - 1, gloumpfSpeed, this.isSolidAt));
          break;
        case 'P':
          this.addPickup('giant', 'potionGiant', x, bottom - 26, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 50, 36, 42));
          break;
        case 'F':
          this.addPickup('plume', 'potionPlume', x, bottom - 26, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 50, 36, 42));
          break;
        case 'S':
          // L'épée déjà en main (ou déjà cassée) ne réapparaît pas après une mort
          if (this.registry.get('hasSword') !== true) {
            this.addPickup('sword', 'sword', x, bottom - 22, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 46, 36, 40), 35);
          }
          break;
        case 'B': {
          const img = this.add.image(x, bottom + 2, 'peel').setOrigin(0.5, 1).setScale(S).setDepth(5);
          this.peels.push({ img, rect: new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 18, 36, 18), used: false });
          break;
        }
        case 'R': {
          const img = this.add.image(0, bottom + 6, 'ronchon').setOrigin(0.5, 1).setScale(S).setDepth(4);
          const left = e.col * TILE + 18;
          const w = img.displayWidth;
          const h = img.displayHeight;
          img.setX(left + w / 2);
          this.ronchon = img;
          // Zone qui réveille le Ronchon : le corps de roche, sans la massue ni les bras
          this.ronchonBox = new Phaser.Geom.Rectangle(left + w * 0.09, gy - h * 0.86, w * 0.62, h * 0.86);
          for (let i = 0; i < 3; i++) {
            this.zzz.push(
              this.add.text(0, 0, 'Z', { fontFamily: FONT_DISPLAY, fontSize: '30px', color: '#FFFFFF', stroke: CSS.ink, strokeThickness: 6 }).setOrigin(0.5).setDepth(6),
            );
          }
          break;
        }
        case 'A':
          this.anvilTriggers.push({ x: e.col * TILE, offset: ANVIL_OFFSETS[anvilCount++ % ANVIL_OFFSETS.length], fired: false });
          break;
        case 'Z':
          this.princess = this.add.image(x, bottom + 2, 'princess').setOrigin(0.5, 1).setScale(S).setDepth(5);
          this.princessY = this.princess.y;
          this.bubble = new SpeechBubble(this, x, this.princessY - this.princess.displayHeight - 14, 'Tu es encore vivant, toi ?');
          this.bubble.setVisible(false);
          break;
        default:
          if (e.type !== '@') console.warn(`Entité inconnue « ${e.type} » en (${e.col}, ${e.row})`);
      }
    }
  }

  private addPickup(kind: PickupKind, texture: string, x: number, y: number, rect: Phaser.Geom.Rectangle, angle = 0): void {
    const glow = this.add.image(x, y, 'glow').setDepth(4);
    this.tweens.add({ targets: glow, angle: 360, duration: 5000, repeat: -1 });
    const img = this.add.image(x, y, texture).setScale(S).setAngle(angle).setDepth(5);
    this.tweens.add({ targets: img, y: y - 6, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
    this.pickups.push({ kind, img, glow, rect, taken: false, rt: 0 });
  }

  /** Animations de décor : le Ronchon qui respire et ronfle, la princesse qui se balance. */
  private updateAmbient(t: number): void {
    if (this.ronchon) {
      this.ronchon.setScale(S, S * (1 + Math.sin(t * 1.6) * 0.015));
      const sleeping = this.deathId !== 'ronchon';
      const w = this.ronchon.displayWidth;
      const h = this.ronchon.displayHeight;
      const left = this.ronchon.x - w / 2;
      this.zzz.forEach((z, i) => {
        const ph = (t * 0.5 + i / 3) % 1;
        z.setVisible(sleeping)
          .setAlpha(1 - ph)
          .setScale((22 + ph * 18) / 30)
          .setPosition(left + w * 0.5 + ph * 50, this.groundY() - h * 0.8 - ph * 80);
      });
    }
    if (this.princess) this.princess.y = this.princessY + Math.sin(t * 2) * 2;
  }

  // ------------------------------------------------------------------ gameplay

  private attack(): void {
    const r = this.hero.tryAttack();
    if (r === 'swing') sound.play('swing');
    else if (r === 'nosword') comicText(this, this.hero.x, this.hero.y - 90, "PAS D'ÉPÉE !", { size: 26, color: '#FFFFFF' });
  }

  /** Coup d'épée : tout Gloumpf touché est écrasé ; l'épée casse au bout de SWORD_HITS coups. */
  private swordStrikes(atk: Phaser.Geom.Rectangle): void {
    for (const g of this.gloumpfs) {
      if (!g.alive || !overlap(atk, bodyRect(g.arcade))) continue;
      this.squashGloumpf(g);
      this.swordHits++;
      this.registry.set('swordHits', this.swordHits);
      if (this.swordHits >= SWORD_HITS) {
        this.hero.hasSword = false;
        this.swordHits = 0;
        this.registry.set('hasSword', false);
        this.registry.set('swordHits', 0);
        sound.play('crack');
        comicText(this, this.hero.x, this.hero.y - 110, 'CRAC ! ÉPÉE CASSÉE', { size: 32 });
      }
    }
  }

  private squashGloumpf(g: Gloumpf): void {
    g.squash();
    sound.play('stomp');
    comicText(this, g.x, g.y - 60, 'SPLOTCH !', { size: 40, color: CSS.pink });
    this.burst(g.x, g.y - 20, 8, COLORS.goo, true);
  }

  private touchGloumpf(g: Gloumpf): void {
    if (this.ended || !g.alive) return;
    const hb = this.hero.arcade;
    const wasAbove = hb.prev.y + hb.height <= g.arcade.top + 14;
    if (this.hero.isGiant || (hb.velocity.y > 0 && wasAbove)) {
      this.squashGloumpf(g);
      if (!this.hero.isGiant) this.hero.bounce();
    } else {
      this.die('colle');
    }
  }

  /** Objets à ramasser : épée, potions. Les potions reviennent 2 s après la fin de leur effet. */
  private updatePickups(dt: number): void {
    const hero = this.hero;
    const heroRect = hero.rect;
    for (const p of this.pickups) {
      if (p.taken) {
        if (p.kind !== 'sword' && !hero.isGiant && hero.flyTime <= 0) {
          p.rt += dt;
          if (p.rt > 2) this.setPickupVisible(p, true);
        }
        continue;
      }
      if (!overlap(heroRect, p.rect)) continue;
      this.setPickupVisible(p, false);
      sound.play('pick');
      const above = hero.y - hero.displayHeight - 20;
      if (p.kind === 'sword') {
        hero.hasSword = true;
        this.swordHits = 0;
        this.registry.set('hasSword', true);
        this.registry.set('swordHits', 0);
        comicText(this, hero.x, above, 'ÉPÉE !', { size: 40 });
      } else if (p.kind === 'giant') {
        hero.makeGiant(MODES[this.mode].giantDuration);
        comicText(this, hero.x, above, 'GÉANT !', { size: 46, color: CSS.tomato });
      } else {
        hero.makeFly(MODES[this.mode].flyDuration);
        comicText(this, hero.x, above - 10, 'PLUME !\nGARDE SAUT APPUYÉ', { size: 28, life: 1500 });
      }
    }
  }

  private setPickupVisible(p: Pickup, visible: boolean): void {
    p.taken = !visible;
    p.rt = 0;
    p.img.setVisible(visible);
    p.glow.setVisible(visible);
  }

  /** Peau de banane : glissade forcée si on la touche au sol. */
  private updatePeels(): void {
    const hero = this.hero;
    for (const peel of this.peels) {
      if (peel.used || !hero.onGround || !overlap(hero.rect, peel.rect)) continue;
      peel.used = true;
      peel.img.setVisible(false);
      hero.startSlide(Math.abs(hero.arcade.velocity.x) > 10 ? (Math.sign(hero.arcade.velocity.x) as 1 | -1) : hero.face);
      sound.play('slip');
      comicText(this, hero.x, hero.y - hero.displayHeight - 20, 'OUPS !', { size: 44 });
    }
  }

  private onAnvilLanded(a: Anvil): void {
    sound.play('clong');
    this.cameras.main.shake(300, 0.012);
    comicText(this, a.x, this.groundY() - 110, 'CLONG !', { size: 54 });
    this.burst(a.x, this.groundY() - 6, 10, 0xe8dcc0, false, 160);
  }

  /** Quand le héros redevient petit, les potions bues réapparaissent (voir updatePickups). */
  private onShrink(): void {
    sound.play('pouf');
    comicText(this, this.hero.x, this.hero.y - 80, 'POUF !', { size: 40, color: '#FFFFFF' });
  }

  private onFlyEnd(): void {
    this.bird.leave();
    comicText(this, this.hero.x, this.hero.y - 100, 'PLUS DE PLUME !', { size: 30, color: '#FFFFFF' });
  }

  /** En mode Géant, toute caisse touchée (devant, au-dessus, en dessous) vole en éclats. */
  private smashCratesAround(): void {
    const b = this.hero.arcade;
    const zone = new Phaser.Geom.Rectangle(b.left - 6, b.top - 6, b.width + 12, b.height + 6);
    const hit = new Set<number>();
    for (const obj of this.crates.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (overlap(zone, obj.getBounds())) hit.add(obj.x);
    }
    hit.forEach((x) => this.breakCrateColumn(x));
  }

  /** Vrai si une case de roche est juste au-dessus de la tête du héros. */
  private ceilingAbove(): boolean {
    const b = this.hero.arcade;
    const row = Math.floor((b.top - 2) / TILE);
    for (let c = Math.floor(b.left / TILE); c <= Math.floor((b.right - 1) / TILE); c++) {
      if (this.tileAt(c, row) === TILE_GROUND) return true;
    }
    return false;
  }

  private breakCrateColumn(x: number): void {
    for (const obj of [...this.crates.getChildren()] as Phaser.Physics.Arcade.Image[]) {
      if (Math.abs(obj.x - x) > 1) continue;
      this.burst(obj.x, obj.y, 4, COLORS.crate, false, 180);
      obj.destroy();
    }
    if (this.crackCooldown <= 0) {
      this.crackCooldown = 0.4;
      this.cameras.main.shake(150, 0.006);
      sound.play('crack');
      comicText(this, x, 5 * TILE, 'CRAC !', { size: 54 });
    }
  }

  /** Éclaboussure de petits morceaux (débris de caisse, gelée de Gloumpf, poussière). */
  private burst(x: number, y: number, n: number, color: number, round = false, spread = 200): void {
    for (let i = 0; i < n; i++) {
      const size = Phaser.Math.Between(8, 16);
      const p = round ? this.add.circle(x, y, size / 2, color) : this.add.rectangle(x, y, size, size, color);
      p.setStrokeStyle(2, COLORS.ink).setDepth(30);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-spread, spread),
        y: y + Phaser.Math.Between(-160, 60),
        angle: 360,
        alpha: 0,
        duration: 700,
        ease: 'Quad.Out',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ------------------------------------------------------------------ mort et victoire

  private die(id: DeathId): void {
    if (this.ended) return;
    this.ended = true;
    this.deathId = id;
    this.dyingT = 0;
    const isNew = album.add(id);
    const d = DEATH_BY_ID[id];
    const hero = this.hero;
    this.physics.pause();
    this.controls.reset();
    hero.hideAccessories();
    this.hud.update({ giant: null, fly: null, swordLeft: null });
    this.cameras.main.shake(250, 0.01);
    sound.play('death');

    const cam = this.cameras.main;
    const sx = Phaser.Math.Clamp(hero.x, cam.scrollX + 160, cam.scrollX + GAME_WIDTH - 160);
    const sy = Phaser.Math.Clamp(hero.y - 90, 120, GAME_HEIGHT - 120);
    const sfxOpts = { size: 64, life: 0, color: '#FFFFFF' };

    switch (id) {
      case 'ronchon': {
        // ATCHOUM ! Le héros est éternué dans les airs
        this.dyingVx = -650;
        this.dyingVy = -950;
        sound.play('sneeze');
        if (this.ronchon) {
          const tx = Phaser.Math.Clamp(this.ronchon.x - this.ronchon.displayWidth * 0.08, cam.scrollX + 190, cam.scrollX + GAME_WIDTH - 190);
          comicText(this, tx, this.groundY() - this.ronchon.displayHeight - 10, d.sfx, { ...sfxOpts, size: 66, color: CSS.banana });
        }
        break;
      }
      case 'oiseau':
        comicText(this, sx, 120, d.sfx, { ...sfxOpts, color: CSS.banana });
        break;
      case 'plongeon':
      case 'banane':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, size: 56 });
        break;
      case 'colle':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.pink });
        hero.setTint(0xf3a6db);
        this.burst(hero.x, hero.y - 26, 12, COLORS.goo, true, 180);
        break;
      case 'bonk':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
        hero.setScale(hero.scaleX, hero.scaleY * 0.6);
        break;
      default:
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
    }
    if (id === 'enclume') hero.setVisible(false); // l'enclume est posée dessus

    // Petit fantôme qui s'envole (seulement quand le héros reste à l'écran, façon « pouf »)
    if (id === 'colle' || id === 'bonk' || id === 'enclume') {
      const ghost = this.add.image(hero.x, hero.y - 40, 'ghost').setScale(S).setDepth(40).setAlpha(0);
      this.tweens.add({ targets: ghost, alpha: 0.95, y: ghost.y - 140, duration: 1300, ease: 'Sine.Out' });
    }

    // La case de BD s'affiche pendant que le fantôme monte, juste avant le menu Rejouer
    this.time.delayedCall(DEATH_DELAY, () => {
      this.scene.pause();
      this.scene.launch('Result', { kind: 'death', deathId: id, isNew });
    });
  }

  /** Animations de mort qui continuent à tourner pendant que la physique est en pause. */
  private updateDying(dt: number): void {
    this.dyingT += dt;
    const hero = this.hero;
    if (this.deathId === 'ronchon') {
      this.dyingVy += 1300 * dt;
      hero.x += this.dyingVx * dt;
      hero.y += this.dyingVy * dt;
      hero.rotation += dt * 14;
    } else if (this.deathId === 'oiseau') {
      const img = this.bird.image;
      const topY = hero.y - hero.displayHeight * 0.8 - 6;
      img.setVisible(true);
      if (this.dyingT < 0.35) {
        const k = Math.min(1, dt * 12);
        img.x += (hero.x - img.x) * k;
        img.y += (topY - img.y) * k;
      } else {
        // L'oiseau emporte le héros
        hero.y -= 380 * dt;
        hero.x += 120 * dt;
        img.setPosition(hero.x, hero.y - hero.displayHeight * 0.8 - 6);
      }
    }
  }

  private win(): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    this.hero.hideAccessories();
    this.hud.update({ giant: null, fly: null, swordLeft: null });
    sound.play('win');
    this.bubble?.setText('Encore toi ?!');
    this.bubble?.setVisible(true);
    comicText(this, this.hero.x, this.hero.y - 210, 'BRAVO !', { size: 60, life: 0 });
    this.time.delayedCall(900, () => {
      this.scene.pause();
      this.scene.launch('Result', { kind: 'win' });
    });
  }

  // ------------------------------------------------------------------ pause et album

  private pauseGame(): void {
    if (this.ended) return;
    this.controls.reset();
    this.scene.pause();
    this.scene.launch('Pause');
  }

  private openAlbumOverlay(): void {
    if (this.ended) return;
    this.controls.reset();
    openAlbum(this);
  }
}
