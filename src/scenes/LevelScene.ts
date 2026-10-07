// Scène de jeu : construit le niveau depuis la carte ASCII, gère le héros, les monstres,
// les objets, les morts (→ album) et la victoire.
//
// État actuel (v0.1) : sol, planches, caisses, Gloumpfs, trous, potion Géante, plafond (BONK),
// drapeaux, princesse. Les éléments marqués [à coder] dans src/levels/types.ts sont affichés
// mais n'ont pas encore de comportement (voir docs/ROADMAP.md).

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_HEIGHT, GAME_WIDTH, MODES, SPRITE_RES, TILE, type Mode } from '../config';
import { DEATH_BY_ID, type DeathId } from '../data/deaths';
import { LEVEL_1 } from '../levels/level1';
import { parseLevel, TILE_CRATE, TILE_EMPTY, TILE_GROUND, TILE_PLANK, type ParsedLevel } from '../levels/types';
import { Gloumpf } from '../objects/Gloumpf';
import { Hero } from '../objects/Hero';
import { album } from '../systems/album';
import { Controls } from '../systems/Controls';
import { addTouchControls } from '../ui/TouchControls';
import { comicText } from '../ui/comicText';

interface Checkpoint {
  x: number;
  flag?: Phaser.GameObjects.Image;
  on: boolean;
}

const S = 1 / SPRITE_RES;

export class LevelScene extends Phaser.Scene {
  private level!: ParsedLevel;
  private hero!: Hero;
  private controls!: Controls;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private planks!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private gloumpfs: Gloumpf[] = [];
  private checkpoints: Checkpoint[] = [];
  private giantPotions: Phaser.Physics.Arcade.Image[] = [];
  private princess?: Phaser.GameObjects.Image;
  private hillsFar!: Phaser.GameObjects.TileSprite;
  private hillsNear!: Phaser.GameObjects.TileSprite;
  private powerBar!: Phaser.GameObjects.Graphics;
  private ended = false;
  private crackCooldown = 0;

  constructor() {
    super('Level');
  }

  private get mode(): Mode {
    return (this.registry.get('mode') as Mode) ?? 'petit';
  }

  init(data: { fromCheckpoint?: boolean }): void {
    if (!data?.fromCheckpoint) this.registry.set('checkpoint', 0);
    this.ended = false;
    this.gloumpfs = [];
    this.checkpoints = [];
    this.giantPotions = [];
    this.crackCooldown = 0;
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
    this.buildEntities(settings.gloumpfSpeed);

    // Héros au dernier drapeau atteint
    const cpIndex = Math.min(this.registry.get('checkpoint') ?? 0, this.checkpoints.length - 1);
    this.checkpoints.forEach((cp, i) => {
      cp.on = i <= cpIndex;
      cp.flag?.setTexture(cp.on ? 'flag-on' : 'flag-off');
    });
    const start = this.checkpoints[cpIndex];
    this.hero = new Hero(this, start.x + TILE / 2, this.groundY() - 1, settings.heroSpeed);
    this.hero.on('shrink', () => this.onShrink());
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
    for (const p of this.giantPotions) {
      this.physics.add.overlap(this.hero, p, () => this.takeGiantPotion(p));
    }

    // Entrées + HUD
    this.controls = new Controls(this);
    addTouchControls(this, this.controls);
    this.buildHud();
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.hillsFar.tilePositionX = this.cameras.main.scrollX * 0.15;
    this.hillsNear.tilePositionX = this.cameras.main.scrollX * 0.38;
    if (this.ended) return;
    if (this.crackCooldown > 0) this.crackCooldown -= dt;

    this.hero.step(dt, this.controls.read());
    for (const g of this.gloumpfs) g.step(dt);

    const body = this.hero.arcade;
    if (this.hero.y > GAME_HEIGHT + 120) return this.die('plongeon');
    if (this.hero.isGiant) {
      this.smashCratesAround();
      if ((body.blocked.up || body.touching.up) && this.ceilingAbove()) return this.die('bonk');
    }

    // Drapeaux
    this.checkpoints.forEach((cp, i) => {
      if (!cp.on && this.hero.x > cp.x + 20) {
        cp.on = true;
        cp.flag?.setTexture('flag-on');
        this.registry.set('checkpoint', Math.max(i, this.registry.get('checkpoint') ?? 0));
        comicText(this, cp.x + 20, this.groundY() - 130, 'DRAPEAU !', { size: 30, color: '#FFFFFF' });
      }
    });

    // Princesse = fin du niveau
    if (this.princess && this.hero.x > this.princess.x - 40) this.win();

    this.drawPowerBar();
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

  private buildEntities(gloumpfSpeed: number): void {
    const gy = this.groundY();
    const start = this.level.entities.find((e) => e.type === '@');
    this.checkpoints.push({ x: (start?.col ?? 1) * TILE, on: true });

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
        case 'P': {
          const p = this.physics.add.image(x, bottom - 26, 'potionGiant').setScale(S).setDepth(5);
          (p.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
          this.tweens.add({ targets: p, y: p.y - 6, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
          this.giantPotions.push(p);
          break;
        }
        case 'Z':
          this.princess = this.add.image(x, bottom + 2, 'princess').setOrigin(0.5, 1).setScale(S).setDepth(5);
          break;
        // ---- Éléments affichés, comportement à coder (docs/ROADMAP.md) ----
        case 'S':
          this.add.image(x, bottom - 22, 'sword').setScale(S).setAngle(35).setDepth(5);
          break;
        case 'F':
          this.add.image(x, bottom - 26, 'potionPlume').setScale(S).setDepth(5);
          break;
        case 'B':
          this.add.image(x, bottom - 6, 'peel').setScale(S).setDepth(5);
          break;
        case 'R':
          this.add.image(e.col * TILE, bottom + 6, 'ronchon').setOrigin(0, 1).setScale(S).setDepth(4);
          break;
        case 'A':
          break; // déclencheur invisible
        default:
          if (e.type !== '@') console.warn(`Entité inconnue « ${e.type} » en (${e.col}, ${e.row})`);
      }
    }
  }

  private buildHud(): void {
    this.add
      .text(14, 12, `NIVEAU ${this.level.data.id} · ${this.level.data.name}`, {
        fontFamily: FONT_DISPLAY, fontSize: '24px', color: CSS.ink, backgroundColor: '#FFFFFF', padding: { x: 10, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(90);
    this.add
      .text(GAME_WIDTH - 14, 12, `ALBUM ${album.size}/${album.total}`, {
        fontFamily: FONT_DISPLAY, fontSize: '24px', color: CSS.ink, backgroundColor: '#FFFFFF', padding: { x: 10, y: 3 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(90);
    this.powerBar = this.add.graphics().setScrollFactor(0).setDepth(90);
  }

  private drawPowerBar(): void {
    const g = this.powerBar;
    g.clear();
    if (!this.hero.isGiant) return;
    const frac = this.hero.giantTime / MODES[this.mode].giantDuration;
    const x = GAME_WIDTH / 2 - 80, y = 18;
    g.fillStyle(0xffffff, 1).fillRoundedRect(x - 8, y - 6, 176, 34, 8);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x - 8, y - 6, 176, 34, 8);
    g.fillStyle(COLORS.locked, 1).fillRoundedRect(x, y, 160, 22, 6);
    g.fillStyle(COLORS.tomato, 1).fillRoundedRect(x, y, Math.max(8, 160 * frac), 22, 6);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x, y, 160, 22, 6);
  }

  // ------------------------------------------------------------------ gameplay

  private touchGloumpf(g: Gloumpf): void {
    if (this.ended || !g.alive) return;
    const hb = this.hero.arcade;
    const wasAbove = hb.prev.y + hb.height <= g.arcade.top + 14;
    if (this.hero.isGiant || (hb.velocity.y > 0 && wasAbove)) {
      g.squash();
      comicText(this, g.x, g.y - 60, 'SPLOTCH !', { size: 40, color: CSS.pink });
      if (!this.hero.isGiant) this.hero.bounce();
    } else {
      this.die('colle');
    }
  }

  private takeGiantPotion(p: Phaser.Physics.Arcade.Image): void {
    if (!p.visible || this.hero.isGiant) return;
    p.setVisible(false);
    (p.body as Phaser.Physics.Arcade.Body).enable = false;
    this.hero.makeGiant(MODES[this.mode].giantDuration);
    comicText(this, this.hero.x, this.hero.y - 130, 'GÉANT !', { size: 46, color: CSS.tomato });
  }

  /** Quand le héros redevient petit, les potions bues réapparaissent (pour ne jamais rester bloqué). */
  private onShrink(): void {
    comicText(this, this.hero.x, this.hero.y - 80, 'POUF !', { size: 40, color: '#FFFFFF' });
    this.time.delayedCall(2000, () => {
      for (const p of this.giantPotions) {
        p.setVisible(true);
        (p.body as Phaser.Physics.Arcade.Body).enable = true;
      }
    });
  }

  /** En mode Géant, toute caisse touchée (devant, au-dessus, en dessous) vole en éclats. */
  private smashCratesAround(): void {
    const b = this.hero.arcade;
    const zone = new Phaser.Geom.Rectangle(b.left - 6, b.top - 6, b.width + 12, b.height + 6);
    const hit = new Set<number>();
    for (const obj of this.crates.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (Phaser.Geom.Rectangle.Overlaps(zone, obj.getBounds())) hit.add(obj.x);
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
      for (let i = 0; i < 4; i++) {
        const chip = this.add.rectangle(obj.x, obj.y, 12, 12, COLORS.crate).setStrokeStyle(2, COLORS.ink).setDepth(30);
        this.tweens.add({
          targets: chip,
          x: obj.x + Phaser.Math.Between(-140, 220),
          y: obj.y + Phaser.Math.Between(-160, 60),
          angle: 360,
          alpha: 0,
          duration: 700,
          onComplete: () => chip.destroy(),
        });
      }
      obj.destroy();
    }
    if (this.crackCooldown <= 0) {
      this.crackCooldown = 0.4;
      this.cameras.main.shake(150, 0.006);
      comicText(this, x, 5 * TILE, 'CRAC !', { size: 54 });
    }
  }

  private die(id: DeathId): void {
    if (this.ended) return;
    this.ended = true;
    const isNew = album.add(id);
    const d = DEATH_BY_ID[id];
    this.physics.pause();
    this.controls.reset();
    this.cameras.main.shake(250, 0.01);

    const cam = this.cameras.main;
    const sx = Phaser.Math.Clamp(this.hero.x, cam.scrollX + 160, cam.scrollX + GAME_WIDTH - 160);
    const sy = Phaser.Math.Clamp(this.hero.y - 90, 120, GAME_HEIGHT - 120);
    comicText(this, sx, sy, d.sfx, { size: 64, life: 0 });

    if (this.hero.y < GAME_HEIGHT) {
      // Petit fantôme qui s'envole
      const ghost = this.add.image(this.hero.x, this.hero.y - 40, 'ghost').setScale(S).setDepth(40).setAlpha(0);
      this.tweens.add({ targets: ghost, alpha: 0.95, y: ghost.y - 140, duration: 1300, ease: 'Sine.Out' });
      if (id === 'bonk') this.hero.setScale(this.hero.scaleX, this.hero.scaleY * 0.6);
      if (id === 'colle') this.hero.setTint(0xf3a6db);
    }

    this.time.delayedCall(1400, () => {
      this.scene.pause();
      this.scene.launch('Result', { kind: 'death', deathId: id, isNew });
    });
  }

  private win(): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    comicText(this, this.hero.x, this.hero.y - 120, 'BRAVO !', { size: 60, life: 0 });
    this.time.delayedCall(900, () => {
      this.scene.pause();
      this.scene.launch('Result', { kind: 'win' });
    });
  }
}
