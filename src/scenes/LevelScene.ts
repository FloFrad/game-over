// Scène de jeu : construit le niveau depuis la carte ASCII, gère le héros, les monstres,
// les objets, les pièges, les boss, les morts (→ album) et la victoire.
//
// Les pièges et monstres des mondes 1 à 4 sont des « Hazard » (objects/foes.ts, terrain.ts, Boss.ts) :
// la scène leur passe un contexte à chaque image et reçoit en retour l'id d'une mort éventuelle.

import Phaser from 'phaser';
import { COLORS, CSS, FONT_DISPLAY, GAME_HEIGHT, GAME_WIDTH, MODES, SPRITE_RES, TILE, type Mode } from '../config';
import { DEATH_BY_ID, type DeathId } from '../data/deaths';
import { THEMES, type Theme } from '../data/themes';
import { LEVELS } from '../levels';
import { LEVEL_1 } from '../levels/level1';
import { parseLevel, TILE_CRATE, TILE_EMPTY, TILE_GROUND, TILE_ICE, TILE_PLANK, type ParsedLevel } from '../levels/types';
import { Anvil } from '../objects/Anvil';
import { Bird } from '../objects/Bird';
import { Boss, type BossKind } from '../objects/Boss';
import { Armor, Beehive, Frog, MimicChest, Mosquito, MouthDoor, Shooter, Snail, Stalactite } from '../objects/foes';
import { Gloumpf } from '../objects/Gloumpf';
import { rectOf, type Ctx, type Hazard, type Rect, type Target } from '../objects/hazard';
import { Hero, type Tool } from '../objects/Hero';
import type { Projectile } from '../objects/Projectile';
import { Fragile, Lily, Mushroom, Quicksand } from '../objects/terrain';
import { album } from '../systems/album';
import { Controls } from '../systems/Controls';
import { progress } from '../systems/progress';
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

type PickupKind = 'sword' | 'pan' | 'boomerang' | 'giant' | 'plume' | 'tiny' | 'ghost';

const TOOLS: PickupKind[] = ['sword', 'pan', 'boomerang'];

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

/** Arène d'un boss : herse d'entrée (se ferme), herse de sortie (s'ouvre à la victoire). */
interface Arena {
  left: number;
  right: number;
  entryCol: number;
  exitCol: number;
  entryRow: number;
  exitRow: number;
  boss: Boss;
  closed: boolean;
  entry: Phaser.GameObjects.Image[];
  exit: Phaser.GameObjects.Image[];
}

interface BoomerangShot {
  img: Phaser.GameObjects.Image;
  phase: 'out' | 'back';
  dir: 1 | -1;
  startX: number;
  /** Hauteur du lancer : en mode Grand, il revient en ligne droite. */
  y: number;
}

const S = 1 / SPRITE_RES;
const ANVIL_OFFSETS = [0, 170];
const SWORD_HITS = 4;
/** Délai entre la mort et la case de BD (le fantôme est en train de monter). */
const DEATH_DELAY = 1000;
/** Morts où le héros tombe, vole ou disparaît : pas de petit fantôme qui s'envole. */
const NO_GHOST: DeathId[] = ['plongeon', 'banane', 'liane', 'pont', 'glissade', 'nenuphar', 'ronchon', 'oiseau', 'champignon', 'sauvetage', 'lave', 'sables', 'grenouille', 'porte', 'coffre'];

const overlap = Phaser.Geom.Rectangle.Overlaps;
const bodyRect = (b: Phaser.Physics.Arcade.Body) => new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);

export class LevelScene extends Phaser.Scene {
  private level!: ParsedLevel;
  private theme!: Theme;
  private hero!: Hero;
  private controls!: Controls;
  private hud!: Hud;
  private ctx!: Ctx;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private planks!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private gates!: Phaser.Physics.Arcade.StaticGroup;
  private gloumpfs: Gloumpf[] = [];
  private hazards: Hazard[] = [];
  private projectiles: Projectile[] = [];
  private targets: Target[] = [];
  private arenas: Arena[] = [];
  private lava: Phaser.Geom.Rectangle[] = [];
  private flowing: Phaser.GameObjects.TileSprite[] = [];
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
  private boomerang?: BoomerangShot;
  private bossHud?: { box: Phaser.GameObjects.Container; name: Phaser.GameObjects.Text; hearts: Phaser.GameObjects.Image[] };
  private fallCause?: { id: DeathId; until: number };
  private iceT = 0;
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

  init(data: { levelId?: number; fromCheckpoint?: boolean }): void {
    if (data?.levelId !== undefined) this.registry.set('levelId', data.levelId);
    if (!data?.fromCheckpoint) {
      this.registry.set('checkpoint', 0);
      this.registry.set('tool', null);
      this.registry.set('swordHits', 0);
    }
    this.ended = false;
    this.gloumpfs = [];
    this.hazards = [];
    this.projectiles = [];
    this.targets = [];
    this.arenas = [];
    this.lava = [];
    this.flowing = [];
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
    this.boomerang = undefined;
    this.bossHud = undefined;
    this.fallCause = undefined;
    this.iceT = 0;
    this.deathId = undefined;
    this.crackCooldown = 0;
    this.dyingT = 0;
  }

  create(): void {
    this.level = parseLevel(LEVELS[this.registry.get('levelId') ?? 1] ?? LEVEL_1);
    this.theme = THEMES[this.level.data.theme];
    const worldW = this.level.cols * TILE;
    const settings = MODES[this.mode];

    this.physics.world.setBounds(0, -400, worldW, GAME_HEIGHT + 800);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBackgroundColor(this.theme.sky).setBounds(0, 0, worldW, GAME_HEIGHT);

    this.buildBackground(worldW);
    this.buildTiles();
    this.buildLiquids();
    this.gates = this.physics.add.staticGroup();
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
    this.hero.setTool((this.registry.get('tool') as Tool | null) ?? null);
    this.swordHits = this.registry.get('swordHits') ?? 0;
    this.hero.canGrow = () => this.roomToGrow();
    this.hero.on('jump', () => sound.play('jump'));
    this.hero.on('shrink', () => this.onShrink());
    this.hero.on('grow', () => this.onShrink());
    this.hero.on('ghostEnd', () => comicText(this, this.hero.x, this.hero.y - 100, 'PLUS FANTÔME !', { size: 28, color: '#FFFFFF' }));
    this.hero.on('flyEnd', () => this.onFlyEnd());
    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);

    // Collisions
    this.physics.add.collider(this.hero, this.solids);
    this.physics.add.collider(this.hero, this.planks);
    this.physics.add.collider(this.hero, this.crates);
    this.physics.add.collider(this.hero, this.gates);
    for (const g of this.gloumpfs) {
      this.physics.add.collider(g, this.solids);
      this.physics.add.collider(g, this.planks);
      this.physics.add.collider(g, this.crates);
      this.physics.add.collider(g, this.gates);
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
    this.buildBossHud();
    this.ctx = this.makeContext();
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
    for (const f of this.flowing) f.tilePositionX = t * 22;
    this.updateAmbient(t);
    if (this.ended) {
      this.updateDying(dt);
      return;
    }
    if (this.crackCooldown > 0) this.crackCooldown -= dt;

    const c = this.controls.read();
    const hero = this.hero;
    const body = hero.arcade;
    hero.onIce = hero.onGround && this.tileAt(Math.floor(body.center.x / TILE), Math.floor((body.bottom + 2) / TILE)) === TILE_ICE;
    this.iceT = hero.onIce ? 2.2 : Math.max(0, this.iceT - dt);
    hero.step(dt, c);
    if (c.attackPressed) this.attack();
    for (const g of this.gloumpfs) g.step(dt);

    // Chutes : la cause dépend de ce qu'on faisait juste avant (banane, pont, nénuphar, glace…)
    if (hero.y > GAME_HEIGHT + 120) return this.die(this.fallDeath(t));
    if (hero.flyTime > 0 && body.top < 62) return this.die('oiseau');
    if (hero.isGiant) {
      this.smashCratesAround();
      if ((body.blocked.up || body.touching.up) && this.ceilingAbove()) return this.die('bonk');
    }
    for (const r of this.lava) if (overlap(hero.rect, r)) return this.die('lave');

    const atk = hero.attackBox();
    if (atk && hero.tool === 'sword') this.swordStrikes(atk);
    else if (atk && hero.tool === 'pan') this.panStrikes(atk);
    this.updatePickups(dt);
    this.updatePeels();
    this.updateBoomerang(dt, c.attackPressed);

    // Le Ronchon endormi : le toucher (ou le taper) le réveille
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

    // Pièges, monstres, boss, projectiles
    const hit = this.stepHazards(dt, t, c, atk);
    if (hit) return this.die(hit);
    this.updateArenas();

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

    const m = MODES[this.mode];
    this.hud.update({
      giant: hero.isGiant ? hero.giantTime / m.giantDuration : null,
      fly: hero.flyTime > 0 ? hero.flyTime / m.flyDuration : null,
      tiny: hero.isTiny ? Math.min(1, hero.tinyTime / m.tinyDuration) : null,
      ghost: hero.isGhost ? hero.ghostTime / m.ghostDuration : null,
      tool: hero.tool,
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

  /** Y a-t-il la place de grandir (fin de la potion Minus) là où se trouve le héros ? */
  private roomToGrow(): boolean {
    const b = this.hero.arcade;
    const top = b.bottom - 56;
    for (let r = Math.floor(top / TILE); r <= Math.floor((b.top - 1) / TILE); r++) {
      for (let c = Math.floor((b.center.x - 18) / TILE); c <= Math.floor((b.center.x + 18) / TILE); c++) {
        if (this.tileAt(c, r) !== TILE_EMPTY) return false;
      }
    }
    return true;
  }

  private buildBackground(worldW: number): void {
    const id = this.theme.id;
    this.add.image(840, 96, `sun-${id}`).setScrollFactor(0).setDepth(-10);
    for (let x = 80; x < worldW * 0.25 + GAME_WIDTH; x += 380) {
      this.add.image(x, 70 + ((x * 7) % 70), 'cloud').setScrollFactor(0.2).setDepth(-9).setTint(this.theme.cloudTint);
    }
    this.hillsFar = this.add.tileSprite(0, 200, GAME_WIDTH, 300, `hills-far-${id}`).setOrigin(0).setScrollFactor(0).setDepth(-8);
    this.hillsNear = this.add.tileSprite(0, 250, GAME_WIDTH, 300, `hills-near-${id}`).setOrigin(0).setScrollFactor(0).setDepth(-7);
    this.level.data.decor.forEach((c, i) => {
      this.add
        .image(c * TILE + 20, this.groundY() + 2, `decor-${this.theme.decor[i % 2]}`)
        .setOrigin(0.5, 1)
        .setDepth(-5)
        .setScale(0.85 + ((c * 37) % 5) * 0.08);
    });
  }

  private isRock = (t: number): boolean => t === TILE_GROUND || t === TILE_ICE;

  private buildTiles(): void {
    this.solids = this.physics.add.staticGroup();
    this.planks = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    const outline = this.add.graphics().setDepth(2);
    outline.lineStyle(4, COLORS.ink, 1);
    const id = this.theme.id;

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        const t = this.level.grid[r][c];
        const x = c * TILE, y = r * TILE;
        if (this.isRock(t)) {
          const top = r > 0 && !this.isRock(this.tileAt(c, r - 1));
          const key = t === TILE_ICE ? (top ? 'tile-ice-top' : 'tile-ice') : top ? `tile-ground-top-${id}` : `tile-ground-${id}`;
          (this.solids.create(x + TILE / 2, y + TILE / 2, key) as Phaser.GameObjects.Image).setDepth(1);
          if (top) outline.lineBetween(x, y, x + TILE, y);
          if (r < this.level.rows - 1 && !this.isRock(this.tileAt(c, r + 1))) outline.lineBetween(x, y + TILE, x + TILE, y + TILE);
          if (c > 0 && !this.isRock(this.level.grid[r][c - 1])) outline.lineBetween(x, y, x, y + TILE);
          if (c < this.level.cols - 1 && !this.isRock(this.level.grid[r][c + 1])) outline.lineBetween(x + TILE, y, x + TILE, y + TILE);
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

  /** Eau, lave et sables mouvants : bandes qui défilent, dessinées DEVANT le héros (il y disparaît). */
  private buildLiquids(): void {
    const id = this.theme.id;
    const draw = (tiles: { col: number; row: number }[], top: string, fill: string, topOffset: number, alpha: number, flow: boolean) => {
      const set = new Set(tiles.map((t) => `${t.col},${t.row}`));
      const rows = new Map<number, number[]>();
      for (const t of tiles) rows.set(t.row, [...(rows.get(t.row) ?? []), t.col].sort((a, b) => a - b));
      rows.forEach((cols, row) => {
        let i = 0;
        while (i < cols.length) {
          let j = i;
          while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1) j++;
          const x = cols[i] * TILE;
          const w = (cols[j] - cols[i] + 1) * TILE;
          const isTop = !set.has(`${cols[i]},${row - 1}`);
          const ts = this.add
            .tileSprite(x, row * TILE + (isTop ? topOffset : 0), w, TILE, isTop ? top : fill)
            .setOrigin(0)
            .setDepth(24)
            .setAlpha(alpha);
          if (flow && isTop) this.flowing.push(ts);
          i = j + 1;
        }
      });
    };
    draw(this.level.water, `water-top-${id}`, `water-fill-${id}`, -2, 0.92, true);
    draw(this.level.lava, 'lava-top', 'lava-fill', -6, 1, true);
    draw(this.level.sand, 'sand-top', 'sand-fill', -8, 1, false);
    for (const l of this.level.lava) this.lava.push(new Phaser.Geom.Rectangle(l.col * TILE + 2, l.row * TILE + 8, TILE - 4, TILE - 8));

    // Chaque tranche de sable = une zone de sables mouvants (bord supérieur = rangée la plus haute)
    const sandCols = new Map<number, number>();
    for (const s of this.level.sand) sandCols.set(s.col, Math.min(sandCols.get(s.col) ?? 99, s.row));
    const cols = [...sandCols.keys()].sort((a, b) => a - b);
    let i = 0;
    while (i < cols.length) {
      let j = i;
      while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1 && sandCols.get(cols[j + 1]) === sandCols.get(cols[i])) j++;
      this.hazards.push(new Quicksand(cols[i] * TILE, (cols[j] + 1) * TILE, (sandCols.get(cols[i]) ?? 10) * TILE));
      i = j + 1;
    }
  }

  private buildEntities(): void {
    const gy = this.groundY();
    const m = MODES[this.mode];
    const start = this.level.entities.find((e) => e.type === '@');
    this.checkpoints.push({ x: (start?.col ?? 1) * TILE, on: true });
    let anvilCount = 0;
    const fragileDeath: DeathId = this.theme.id === 'forest' ? 'liane' : this.theme.id === 'volcano' ? 'pont' : 'plongeon';
    const stand = (id: DeathId) => (this.fallCause = { id, until: this.time.now / 1000 + 2.6 });
    const arenaParts: { gateIn?: { col: number; row: number }; gateOut?: { col: number; row: number }; bosses: { kind: BossKind; x: number; bottom: number }[] } = { bosses: [] };

    for (const e of this.level.entities) {
      const x = e.col * TILE + TILE / 2;
      const bottom = (e.row + 1) * TILE;
      switch (e.type) {
        case 'K':
          this.checkpoints.push({ x: e.col * TILE, on: false, flag: this.add.image(e.col * TILE + 20, gy, 'flag-off').setOrigin(0.12, 1).setDepth(3) });
          break;
        case 'G':
          this.gloumpfs.push(new Gloumpf(this, x, bottom - 1, m.gloumpfSpeed, this.isSolidAt));
          break;
        case 'P':
          this.addPickup('giant', 'potionGiant', x, bottom - 26, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 50, 36, 42));
          break;
        case 'F':
          this.addPickup('plume', 'potionPlume', x, bottom - 26, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 50, 36, 42));
          break;
        case 'U':
          this.addPickup('tiny', 'potionMinus', x, bottom - 26, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 50, 36, 42));
          break;
        case 'X':
          this.addPickup('ghost', 'potionGhost', x, bottom - 26, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 50, 36, 42));
          break;
        case 'S':
          // L'outil déjà en main ne réapparaît pas après une mort
          if (this.registry.get('tool') !== 'sword') {
            this.addPickup('sword', 'sword', x, bottom - 22, new Phaser.Geom.Rectangle(e.col * TILE + 4, bottom - 46, 36, 40), 35);
          }
          break;
        case 'J':
          if (this.registry.get('tool') !== 'pan') this.addPickup('pan', 'pan', x, bottom - 24, new Phaser.Geom.Rectangle(e.col * TILE - 4, bottom - 46, 52, 40), -25);
          break;
        case 'V':
          if (this.registry.get('tool') !== 'boomerang') this.addPickup('boomerang', 'boomerang', x, bottom - 24, new Phaser.Geom.Rectangle(e.col * TILE + 2, bottom - 46, 40, 40));
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
        case 'Z': {
          const d = this.level.data;
          this.princess = this.add.image(x, bottom + 2, 'princess').setOrigin(0.5, 1).setScale(S).setDepth(5);
          this.princessY = this.princess.y;
          this.bubble = new SpeechBubble(this, x, this.princessY - this.princess.displayHeight - 14, d.greeting ?? 'Tu es encore vivant, toi ?');
          this.bubble.setVisible(false);
          break;
        }
        // ---- monde 1
        case 'H': this.hazards.push(new Beehive(this, x, bottom)); break;
        case 'M': this.hazards.push(new Mushroom(this, x, bottom, false)); break;
        case 'W': this.hazards.push(new Mushroom(this, x, bottom, true)); break;
        case 'f':
          this.hazards.push(new Fragile(this.planks, e.col, e.row, this.theme.id === 'volcano' ? 'frag-stone' : 'frag-forest', 0.6, fragileDeath, stand));
          break;
        case 'r':
          this.hazards.push(new Fragile(this.planks, e.col, e.row, 'frag-rotten', 0.35, fragileDeath, stand));
          break;
        // ---- monde 2
        case 'n': this.hazards.push(new Lily(this, this.planks, e.col, e.row, stand)); break;
        case 's': this.hazards.push(new Snail(this, x, bottom)); break;
        case 'g': this.hazards.push(new Frog(this, x, bottom)); break;
        case 'm': this.hazards.push(new Mosquito(this, x, e.row * TILE + TILE / 2)); break;
        // ---- monde 3
        case 'T': this.hazards.push(new Stalactite(this, x, e.row * TILE, gy)); break;
        case 'O': case 'd': {
          const sh = new Shooter(this, e.type === 'O' ? 'snowman' : 'dragon', x, bottom);
          this.hazards.push(sh);
          this.targets.push(sh);
          break;
        }
        case 'a': this.hazards.push(new Armor(this, x, bottom)); break;
        case 'D': this.hazards.push(new MouthDoor(this, x, bottom)); break;
        // ---- monde 4
        case 'c': this.hazards.push(new MimicChest(this, x, bottom)); break;
        // ---- arènes de boss
        case '[': arenaParts.gateIn = { col: e.col, row: e.row }; break;
        case ']': arenaParts.gateOut = { col: e.col, row: e.row }; break;
        case '1': case '2': case '3': case '4': arenaParts.bosses.push({ kind: Number(e.type) as BossKind, x, bottom }); break;
        default:
          if (e.type !== '@') console.warn(`Entité inconnue « ${e.type} » en (${e.col}, ${e.row})`);
      }
    }

    const b = arenaParts.bosses[0];
    if (b && arenaParts.gateIn && arenaParts.gateOut) this.buildArena(b, arenaParts.gateIn, arenaParts.gateOut);
  }

  private buildArena(b: { kind: BossKind; x: number; bottom: number }, gateIn: { col: number; row: number }, gateOut: { col: number; row: number }): void {
    const left = gateIn.col * TILE;
    const right = (gateOut.col + 1) * TILE;
    const boss = new Boss(this, b.kind, b.x, b.bottom, { left, right }, MODES[this.mode].bossHp);
    this.hazards.push(boss);
    this.targets.push(boss);
    const lastRow = this.level.rows - 3; // dernière rangée au-dessus du sol
    const column = (col: number, row: number) => {
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let r = row; r <= lastRow; r++) imgs.push(this.gates.create(col * TILE + TILE / 2, r * TILE + TILE / 2, 'gate') as Phaser.GameObjects.Image);
      return imgs;
    };
    const exit = column(gateOut.col, gateOut.row);
    exit.forEach((g) => g.setDepth(4));
    const arena: Arena = { left, right, entryCol: gateIn.col, exitCol: gateOut.col, entryRow: gateIn.row, exitRow: gateOut.row, boss, closed: false, entry: [], exit };
    boss.onDefeated = () => {
      sound.play('gate');
      comicText(this, arena.exitCol * TILE, this.groundY() - 160, 'LA PORTE S\'OUVRE !', { size: 34, color: '#FFFFFF', life: 1800 });
      for (const g of arena.exit) {
        this.tweens.add({ targets: g, y: g.y - 220, alpha: 0, duration: 900, onComplete: () => g.destroy() });
        (g.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      }
    };
    this.arenas.push(arena);
  }

  private updateArenas(): void {
    for (const a of this.arenas) {
      if (!a.closed && this.hero.x > a.left + TILE * 2.2) {
        a.closed = true;
        // La herse d'entrée tombe derrière le héros ; le boss se réveille
        for (let r = a.entryRow; r <= this.level.rows - 3; r++) {
          const g = this.gates.create(a.entryCol * TILE + TILE / 2, r * TILE + TILE / 2, 'gate') as Phaser.GameObjects.Image;
          g.setDepth(4);
          a.entry.push(g);
        }
        this.cameras.main.shake(300, 0.012);
        sound.play('gate');
        a.boss.activate();
        comicText(this, this.hero.x, this.groundY() - 200, a.boss.name + ' !', { size: 52, color: CSS.tomato, life: 1800 });
      }
      this.updateBossHud(a);
    }
  }

  private buildBossHud(): void {
    if (!this.arenas.length && !this.level.entities.some((e) => '1234'.includes(e.type))) return;
    const box = this.add.container(GAME_WIDTH / 2, 84).setScrollFactor(0).setDepth(92).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(-150 + 3, -22 + 3, 300, 56, 10);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-150, -22, 300, 56, 10);
    g.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(-150, -22, 300, 56, 10);
    const name = this.add.text(0, -8, '', { fontFamily: FONT_DISPLAY, fontSize: '20px', color: CSS.ink }).setOrigin(0.5);
    const hearts: Phaser.GameObjects.Image[] = [];
    box.add([g, name]);
    this.bossHud = { box, name, hearts };
  }

  private updateBossHud(a: Arena): void {
    const h = this.bossHud;
    if (!h || !a.closed) return;
    h.box.setVisible(!a.boss.defeated || this.time.now % 600 < 500);
    h.name.setText(a.boss.name);
    while (h.hearts.length < a.boss.maxHp) {
      const i = h.hearts.length;
      const img = this.add.image(0, 0, 'heart').setScale(0.9);
      h.box.add(img);
      h.hearts.push(img);
      void i;
    }
    const n = h.hearts.length;
    h.hearts.forEach((img, i) => {
      img.setPosition((i - (n - 1) / 2) * 34, 18);
      img.setTexture(i < a.boss.hp ? 'heart' : 'heart-empty');
    });
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

  // ------------------------------------------------------------------ pièges et monstres

  private makeContext(): Ctx {
    return {
      scene: this,
      hero: this.hero,
      controls: { left: false, right: false, jump: false, attack: false, jumpPressed: false, attackPressed: false },
      mode: MODES[this.mode],
      groundY: this.groundY(),
      t: 0,
      scrollX: 0,
      heroRect: this.hero.rect,
      seen: true,
      attacks: [],
      boomerang: null,
      pan: null,
      projectiles: this.projectiles,
      targets: this.targets,
      isSolidAt: this.isSolidAt,
      say: (x, y, text, opts) => void comicText(this, x, y, text, opts),
      burst: (x, y, n, color, round, spread) => this.burst(x, y, n, color, round, spread),
      sfx: (kind, arg) => sound.play(kind, arg),
      shake: (ms, intensity) => this.cameras.main.shake(ms, intensity),
    };
  }

  private stepHazards(dt: number, t: number, c: Ctx['controls'], atk: Rect | null): DeathId | null {
    const x = this.ctx;
    const hero = this.hero;
    x.t = t;
    x.controls = c;
    x.scrollX = this.cameras.main.scrollX;
    x.heroRect = hero.rect;
    x.seen = !hero.isGhost;
    x.boomerang = this.boomerang ? rectOf(this.boomerang.img.x - 18, this.boomerang.img.y - 14, 36, 28) : null;
    x.pan = hero.tool === 'pan' ? atk : null;
    x.attacks = [];
    if (atk) x.attacks.push(atk);
    if (x.boomerang) x.attacks.push(x.boomerang);

    for (const h of this.hazards) {
      const death = h.step(dt, x);
      if (death) return death;
    }
    for (const p of this.projectiles) {
      const death = p.step(dt, x);
      if (death) return death;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    x.projectiles = this.projectiles;
    return null;
  }

  /** Quelle mort quand le héros tombe hors de l'écran ? Dépend de ce qu'il faisait juste avant. */
  private fallDeath(t: number): DeathId {
    if (this.hero.bananaTime > 0 || this.hero.slideTime > 0) return 'banane';
    if (this.fallCause && this.fallCause.until > t) return this.fallCause.id;
    if (this.iceT > 0) return 'glissade';
    return 'plongeon';
  }

  // ------------------------------------------------------------------ gameplay

  private attack(): void {
    const r = this.hero.tryAttack();
    if (r === 'swing') sound.play('swing');
    else if (r === 'throw') this.throwBoomerang();
    else if (r === 'nosword') comicText(this, this.hero.x, this.hero.y - 90, "RIEN EN MAIN !", { size: 26, color: '#FFFFFF' });
  }

  private throwBoomerang(): void {
    if (this.boomerang) return;
    const h = this.hero;
    const img = this.add.image(h.x + h.face * 24, h.arcade.center.y - 6, 'boomerang').setScale(S).setDepth(30);
    this.boomerang = { img, phase: 'out', dir: h.face, startX: h.x, y: img.y };
    sound.play('whoosh');
  }

  /** Boomerang : part droit devant, revient vers le héros. « Petit » l'attrape au sol tout seul ; « Grand » doit appuyer sur TAPER. */
  private updateBoomerang(dt: number, attackPressed: boolean): void {
    const b = this.boomerang;
    if (!b) return;
    const hero = this.hero;
    const m = MODES[this.mode];
    const speed = 540;
    b.img.rotation += dt * 22;
    if (b.phase === 'out') {
      b.img.x += b.dir * speed * dt;
      if (Math.abs(b.img.x - b.startX) > (this.mode === 'petit' ? 300 : 360) || this.isSolidAt(b.img.x + b.dir * 16, b.img.y)) b.phase = 'back';
      return;
    }
    const target = hero.arcade.center;
    const ty = this.mode === 'petit' ? target.y : b.y;
    const a = Math.atan2(ty - b.img.y, target.x - b.img.x);
    b.img.x += Math.cos(a) * speed * dt;
    b.img.y += Math.sin(a) * speed * dt;
    const d = Phaser.Math.Distance.Between(b.img.x, b.img.y, target.x, target.y);
    if (d < 40) {
      const caught = m.autoCatch ? hero.onGround : attackPressed || this.controls.read().attack;
      if (caught) {
        b.img.destroy();
        this.boomerang = undefined;
        sound.play('pick');
        comicText(this, hero.x, hero.y - hero.displayHeight - 14, 'ATTRAPÉ !', { size: 30, color: '#FFFFFF' });
      } else if (d < 26) {
        b.img.destroy();
        this.boomerang = undefined;
        this.die('boomerang');
      }
    }
  }

  /** Coup d'épée : tout Gloumpf touché est écrasé ; l'épée casse au bout de SWORD_HITS coups. */
  private swordStrikes(atk: Phaser.Geom.Rectangle): void {
    for (const g of this.gloumpfs) {
      if (!g.alive || !overlap(atk, bodyRect(g.arcade))) continue;
      this.squashGloumpf(g);
      this.swordHits++;
      this.registry.set('swordHits', this.swordHits);
      if (this.swordHits >= SWORD_HITS) {
        this.hero.setTool(null);
        this.swordHits = 0;
        this.registry.set('tool', null);
        this.registry.set('swordHits', 0);
        sound.play('crack');
        comicText(this, this.hero.x, this.hero.y - 110, 'CRAC ! ÉPÉE CASSÉE', { size: 32 });
      }
    }
  }

  /** La poêle écrase aussi les Gloumpfs, et ne casse jamais. */
  private panStrikes(atk: Phaser.Geom.Rectangle): void {
    for (const g of this.gloumpfs) if (g.alive && overlap(atk, bodyRect(g.arcade))) this.squashGloumpf(g);
  }

  private squashGloumpf(g: Gloumpf): void {
    g.squash();
    sound.play('stomp');
    comicText(this, g.x, g.y - 60, 'SPLOTCH !', { size: 40, color: CSS.pink });
    this.burst(g.x, g.y - 20, 8, COLORS.goo, true);
  }

  private touchGloumpf(g: Gloumpf): void {
    if (this.ended || !g.alive || this.hero.isGhost) return;
    const hb = this.hero.arcade;
    const wasAbove = hb.prev.y + hb.height <= g.arcade.top + 14;
    if (this.hero.isGiant || (hb.velocity.y > 0 && wasAbove)) {
      this.squashGloumpf(g);
      if (!this.hero.isGiant) this.hero.bounce();
    } else {
      this.die('colle');
    }
  }

  /** Objets à ramasser : outils, potions. Les potions reviennent 2 s après la fin de leur effet. */
  private updatePickups(dt: number): void {
    const hero = this.hero;
    const heroRect = hero.rect;
    const m = MODES[this.mode];
    const potionActive = hero.isGiant || hero.flyTime > 0 || hero.isTiny || hero.isGhost;
    for (const p of this.pickups) {
      const isTool = TOOLS.includes(p.kind);
      if (p.taken) {
        if (!isTool && !potionActive) {
          p.rt += dt;
          if (p.rt > 2) this.setPickupVisible(p, true);
        }
        continue;
      }
      if (!overlap(heroRect, p.rect)) continue;
      this.setPickupVisible(p, false);
      sound.play('pick');
      const above = hero.y - hero.displayHeight - 20;
      if (isTool) {
        // un seul outil à la fois : l'ancien est rendu (son objet réapparaît sur la carte)
        const old = this.hero.tool;
        for (const q of this.pickups) if (q.kind === old && q !== p) this.setPickupVisible(q, true);
        hero.setTool(p.kind as Tool);
        this.registry.set('tool', p.kind);
        if (p.kind === 'sword') {
          this.swordHits = 0;
          this.registry.set('swordHits', 0);
          comicText(this, hero.x, above, 'ÉPÉE !', { size: 40 });
        } else if (p.kind === 'pan') {
          comicText(this, hero.x, above - 10, 'POÊLE !\nRENVOIE LES BOULES', { size: 28, life: 1600 });
        } else {
          comicText(this, hero.x, above - 10, 'BOOMERANG !\nBOUTON TAPER', { size: 28, life: 1600 });
        }
        continue;
      }
      hero.clearPotions();
      if (p.kind === 'giant') {
        hero.makeGiant(m.giantDuration);
        comicText(this, hero.x, above, 'GÉANT !', { size: 46, color: CSS.tomato });
      } else if (p.kind === 'plume') {
        hero.makeFly(m.flyDuration);
        comicText(this, hero.x, above - 10, 'PLUME !\nGARDE SAUT APPUYÉ', { size: 28, life: 1500 });
      } else if (p.kind === 'tiny') {
        hero.makeTiny(m.tinyDuration);
        comicText(this, hero.x, above, 'MINUS !', { size: 46, color: '#7EC8F0' });
      } else {
        hero.makeGhost(m.ghostDuration);
        comicText(this, hero.x, above - 10, 'FANTÔME !\nINVISIBLE POUR LES MONSTRES', { size: 26, life: 1600, color: '#FFFFFF' });
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

  /** Quand le héros redevient petit / normal : POUF (les potions bues réapparaissent, voir updatePickups). */
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
      if (this.isRock(this.tileAt(c, row))) return true;
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

  private die(id: DeathId, force = false): void {
    if (this.ended && !force) return;
    this.ended = true;
    this.deathId = id;
    this.dyingT = 0;
    const isNew = album.add(id);
    const d = DEATH_BY_ID[id];
    const hero = this.hero;
    this.physics.pause();
    this.controls.reset();
    hero.hideAccessories();
    this.boomerang?.img.destroy();
    this.hud.update({ giant: null, fly: null, tiny: null, ghost: null, tool: null, swordLeft: null });
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
      case 'liane':
      case 'pont':
      case 'glissade':
      case 'nenuphar':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, size: 56 });
        if (id === 'nenuphar') sound.play('splash');
        break;
      case 'champignon':
        comicText(this, sx, 130, d.sfx, { ...sfxOpts, size: 56, color: CSS.banana });
        break;
      case 'colle':
      case 'maman':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.pink });
        hero.setTint(0xf3a6db);
        this.burst(hero.x, hero.y - 26, 12, COLORS.goo, true, 180);
        break;
      case 'bonk':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
        hero.setScale(hero.scaleX, hero.scaleY * 0.6);
        break;
      case 'lave':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
        hero.setTint(0x333333);
        sound.play('sizzle');
        this.burst(hero.x, hero.y - 20, 10, 0xf28c28, true, 150);
        break;
      case 'sables':
        comicText(this, sx, sy - 20, d.sfx, { ...sfxOpts, size: 58, color: CSS.banana });
        sound.play('splash');
        break;
      case 'grenouille':
      case 'porte':
      case 'coffre':
        // avalé / croqué : le héros n'est plus là
        hero.setVisible(false);
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
        sound.play(id === 'grenouille' ? 'slurp' : 'chomp');
        break;
      case 'poele':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
        sound.play('bong');
        break;
      case 'stalactite':
      case 'enclume':
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
        hero.setScale(hero.scaleX * 1.2, hero.scaleY * 0.3);
        break;
      default:
        comicText(this, sx, sy, d.sfx, { ...sfxOpts, color: CSS.banana });
    }
    if (id === 'enclume') hero.setVisible(false); // l'enclume est posée dessus

    // Petit fantôme qui s'envole (seulement quand le héros reste à l'écran, façon « pouf »)
    if (!NO_GHOST.includes(id)) {
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
    } else if (this.deathId === 'sables') {
      hero.y += 40 * dt;
    }
  }

  private win(): void {
    if (this.ended) return;
    if (this.level.data.id === 12) return this.finale();
    this.ended = true;
    this.physics.pause();
    this.hero.hideAccessories();
    this.hud.update({ giant: null, fly: null, tiny: null, ghost: null, tool: null, swordLeft: null });
    sound.play('win');
    progress.complete(this.level.data.id);
    this.bubble?.setText(this.level.data.thanks ?? 'Encore toi ?!');
    this.bubble?.setVisible(true);
    comicText(this, this.hero.x, this.hero.y - 210, 'BRAVO !', { size: 60, life: 0 });
    this.time.delayedCall(900, () => {
      this.scene.pause();
      this.scene.launch('Result', { kind: 'win' });
    });
  }

  /**
   * Fin du jeu : le héros sauve enfin la princesse… qui ouvre une trappe par erreur.
   * C'est la dernière case de l'album : « Le sauvetage raté ».
   */
  private finale(): void {
    this.ended = true;
    this.physics.pause();
    this.controls.reset();
    this.hero.hideAccessories();
    this.hud.update({ giant: null, fly: null, tiny: null, ghost: null, tool: null, swordLeft: null });
    progress.complete(12);
    sound.play('win');
    const hero = this.hero;
    const bubble = this.bubble;
    bubble?.setText('Mon héros ! Je vais t\'ouvrir la porte…');
    bubble?.setVisible(true);
    this.time.delayedCall(1700, () => {
      bubble?.setText('Oups ! Mauvais bouton !');
      sound.play('alert');
      const hole = this.add.rectangle(hero.x, hero.y + 6, 70, 14, COLORS.ink).setDepth(19);
      this.tweens.add({ targets: hole, scaleX: 1.6, duration: 300 });
      this.time.delayedCall(450, () => {
        sound.play('slip');
        this.tweens.add({ targets: hero, y: hero.y + 420, angle: 540, duration: 900, ease: 'Quad.In' });
        this.time.delayedCall(700, () => this.die('sauvetage', true));
      });
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
