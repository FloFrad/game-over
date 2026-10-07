// Textures générées au démarrage (décor et tuiles), dans le style de la planche :
// aplats de couleur + contour noir épais. Les textures qui dépendent du monde ont le suffixe `-<thème>`.

import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, TILE } from '../config';
import { THEME_LIST, type Theme } from '../data/themes';

type G = Phaser.GameObjects.Graphics;
type V = Phaser.Math.Vector2;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Contour noir puis remplissage : donne un « nuage » de cercles avec un seul contour extérieur. */
function blob(g: G, circles: [number, number, number][], fill: number, line = 4): void {
  g.fillStyle(COLORS.ink, 1);
  for (const [x, y, r] of circles) g.fillCircle(x, y, r + line);
  g.fillStyle(fill, 1);
  for (const [x, y, r] of circles) g.fillCircle(x, y, r);
}

/** Polygone rempli avec contour. */
function poly(g: G, pts: [number, number][], fill: number, line = 4): void {
  const p: V[] = pts.map(([x, y]) => v(x, y));
  g.fillStyle(fill, 1).fillPoints(p, true);
  g.lineStyle(line, COLORS.ink, 1).strokePoints(p, true);
}

/** Ligne épaisse avec contour noir (branches, tiges…). */
function stick(g: G, x0: number, y0: number, x1: number, y1: number, w: number, fill: number): void {
  g.lineStyle(w + 6, COLORS.ink, 1).lineBetween(x0, y0, x1, y1);
  g.lineStyle(w, fill, 1).lineBetween(x0, y0, x1, y1);
}

function hills(g: G, h: number, base: number, amp: number, fill: number, seed: number, jagged = false): void {
  const pts: V[] = [];
  for (let x = 0; x <= GAME_WIDTH; x += 8) {
    const t = (x / GAME_WIDTH) * Math.PI * 2; // périodique : la texture se répète sans couture
    let y = base - amp * (0.6 * Math.sin(2 * t + seed) + 0.4 * Math.sin(5 * t + seed * 2.3));
    if (jagged) y = base - amp * (0.75 * Math.abs(Math.sin(3 * t + seed)) + 0.35 * Math.abs(Math.sin(7 * t + seed * 1.7))) + amp * 0.4;
    pts.push(v(x, y));
  }
  g.fillStyle(fill, 1);
  g.fillPoints([...pts, v(GAME_WIDTH, h), v(0, h)], true);
  g.lineStyle(4, COLORS.ink, 1);
  g.strokePoints(pts, false);
}

// ------------------------------------------------------------------ par thème

function groundTop(g: G, t: Theme): void {
  g.fillStyle(t.dirt, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(t.dirtDark, 1).fillCircle(14, 30, 5).fillCircle(33, 20, 4);
  if (t.topKind === 'grass') {
    g.fillStyle(t.top, 1).fillRect(0, 0, TILE, 12);
    for (let i = 0; i < 4; i++) g.fillCircle(5.6 + i * 11.25, 12, 5.6);
  } else if (t.topKind === 'moss') {
    g.fillStyle(t.top, 1).fillRect(0, 0, TILE, 10);
    for (let i = 0; i < 3; i++) g.fillCircle(7 + i * 15, 10, 7);
    g.fillStyle(0x86b45a, 1).fillCircle(10, 4, 3).fillCircle(32, 5, 2.5); // bulles de vase
  } else if (t.topKind === 'snow') {
    g.fillStyle(t.top, 1).fillRect(0, 0, TILE, 13);
    for (let i = 0; i < 3; i++) g.fillCircle(7 + i * 15, 13, 7.5);
    g.fillStyle(0xd7e8f7, 1).fillRect(0, 9, TILE, 3);
  } else {
    g.fillStyle(t.top, 1).fillRect(0, 0, TILE, 12);
    g.fillStyle(0xf28c28, 1).fillRect(6, 4, 14, 3).fillRect(26, 6, 12, 3);
    g.fillStyle(0xffd23f, 1).fillRect(10, 5, 5, 1.5);
  }
}

function groundPlain(g: G, t: Theme): void {
  g.fillStyle(t.dirt, 1).fillRect(0, 0, TILE, TILE);
  g.fillStyle(t.dirtDark, 1).fillCircle(12, 14, 4).fillCircle(31, 31, 5);
  if (t.topKind === 'ember') g.fillStyle(0xf28c28, 1).fillRect(18, 22, 10, 2.5);
}

function drawTree(g: G, leaf: number): void {
  g.fillStyle(COLORS.woodDark, 1).fillRect(64, 90, 22, 90);
  g.lineStyle(4, COLORS.ink, 1).strokeRect(64, 90, 22, 92);
  blob(g, [[75, 70, 38], [43, 86, 26], [107, 86, 26], [75, 40, 28]], leaf);
}

function drawDeadTree(g: G): void {
  poly(g, [[62, 180], [68, 100], [60, 60], [72, 20], [80, 62], [86, 100], [92, 180]], 0x5c4a30);
  stick(g, 66, 80, 22, 52, 9, 0x5c4a30);
  stick(g, 84, 70, 128, 38, 9, 0x5c4a30);
  stick(g, 70, 110, 34, 104, 7, 0x5c4a30);
  g.fillStyle(0x7da35a, 1);
  for (const [x, y] of [[30, 56], [38, 108], [120, 44], [112, 52], [48, 62]]) {
    g.lineStyle(3, COLORS.ink, 1).strokeEllipse(x, y + 14, 8, 30);
    g.fillEllipse(x, y + 14, 8, 30);
  }
}

function drawReeds(g: G): void {
  for (const [x, h, lean] of [[30, 120, -8], [52, 148, 4], [74, 130, -2], [96, 110, 10]] as const) {
    stick(g, x, 150, x + lean, 150 - h, 5, 0x6f9a4a);
  }
  for (const [x, y] of [[52 + 4, 2], [30 - 8, 30], [74 - 2, 20], [96 + 10, 40]] as const) {
    g.fillStyle(0x7a4a26, 1).fillEllipse(x, y + 10, 12, 30);
    g.lineStyle(4, COLORS.ink, 1).strokeEllipse(x, y + 10, 12, 30);
  }
}

function drawPine(g: G): void {
  g.fillStyle(COLORS.woodDark, 1).fillRect(52, 140, 16, 40);
  g.lineStyle(4, COLORS.ink, 1).strokeRect(52, 140, 16, 40);
  poly(g, [[60, 60], [12, 150], [108, 150]], 0x3f8a58);
  poly(g, [[60, 24], [20, 100], [100, 100]], 0x4a9c66);
  poly(g, [[60, 2], [30, 56], [90, 56]], 0x57ad73);
  poly(g, [[60, 2], [44, 30], [52, 26], [60, 34], [68, 26], [76, 30]], 0xffffff, 3);
  poly(g, [[60, 60], [44, 82], [52, 78], [60, 86], [68, 78], [76, 82]], 0xffffff, 3);
}

function drawCrystal(g: G): void {
  poly(g, [[20, 130], [28, 60], [44, 26], [56, 62], [60, 130]], 0xaee0ff);
  poly(g, [[50, 130], [60, 40], [74, 6], [90, 44], [98, 130]], 0xcdeeff);
  poly(g, [[80, 130], [90, 80], [106, 52], [112, 90], [118, 130]], 0x8fd0f5);
  g.lineStyle(4, 0xffffff, 1).lineBetween(66, 40, 70, 90).lineBetween(34, 56, 36, 96);
}

function drawSpire(g: G): void {
  poly(g, [[10, 180], [30, 60], [48, 120], [64, 10], [84, 110], [100, 50], [118, 180]], 0x3a2c32);
  g.lineStyle(4, 0xf28c28, 1).lineBetween(64, 30, 60, 110).lineBetween(40, 90, 36, 150).lineBetween(96, 80, 100, 150);
}

function drawCharred(g: G): void {
  poly(g, [[64, 170], [68, 90], [60, 56], [70, 40], [78, 90], [84, 170]], 0x2a2024);
  stick(g, 68, 80, 30, 46, 8, 0x2a2024);
  stick(g, 78, 70, 118, 36, 8, 0x2a2024);
  stick(g, 72, 110, 112, 96, 6, 0x2a2024);
  g.fillStyle(0xf28c28, 1).fillCircle(30, 46, 4).fillCircle(118, 36, 4).fillCircle(112, 96, 3);
}

function sun(g: G, t: Theme): void {
  if (t.id === 'castle') {
    // lune
    g.fillStyle(0xeaf3ff, 1).fillCircle(75, 75, 52);
    g.fillStyle(COLORS.ink, 1).fillCircle(75, 75, 46);
    g.fillStyle(0xf4f8ff, 1).fillCircle(75, 75, 42);
    g.fillStyle(0xd3e0f0, 1).fillCircle(58, 62, 9).fillCircle(90, 88, 12).fillCircle(86, 56, 6);
    return;
  }
  const pts: V[] = [];
  for (let i = 0; i < 28; i++) {
    const r = i % 2 ? 50 : 68;
    const a = (i * Math.PI) / 14;
    pts.push(v(75 + Math.cos(a) * r, 75 + Math.sin(a) * r));
  }
  const rays = t.id === 'volcano' ? 0xf28c28 : t.id === 'swamp' ? 0xf1ecb0 : 0xffe58a;
  const core = t.id === 'volcano' ? COLORS.tomato : t.id === 'swamp' ? 0xe6dd7a : COLORS.banana;
  g.fillStyle(rays, 1).fillPoints(pts, true);
  g.fillStyle(COLORS.ink, 1).fillCircle(75, 75, 44);
  g.fillStyle(core, 1).fillCircle(75, 75, 40);
}

function themeTextures(scene: Phaser.Scene, t: Theme): void {
  const k = (name: string) => `${name}-${t.id}`;
  make(scene, k('tile-ground-top'), TILE, TILE, (g) => groundTop(g, t));
  make(scene, k('tile-ground'), TILE, TILE, (g) => groundPlain(g, t));
  make(scene, k('hills-far'), GAME_WIDTH, 300, (g) => hills(g, 300, 90, 40, t.hillsFar, 1.3, t.id === 'castle'));
  make(scene, k('hills-near'), GAME_WIDTH, 300, (g) => hills(g, 300, 100, 48, t.hillsNear, 4.1, t.id === 'castle' || t.id === 'volcano'));
  make(scene, k('sun'), 150, 150, (g) => sun(g, t));
  const decors: Record<string, [number, number, (g: G) => void]> = {
    tree: [150, 180, (g) => drawTree(g, 0x55aa40)],
    tree2: [150, 180, (g) => drawTree(g, 0x3f9a4a)],
    deadtree: [150, 180, drawDeadTree],
    reeds: [130, 160, drawReeds],
    pine: [120, 182, drawPine],
    crystal: [130, 140, drawCrystal],
    spire: [130, 182, drawSpire],
    charred: [140, 176, drawCharred],
  };
  for (const name of t.decor) {
    const [w, h, draw] = decors[name];
    make(scene, `decor-${name}`, w, h, draw);
  }
  // Surface de l'eau (ou de la lave) : bande qui ondule, défile horizontalement
  make(scene, k('water-top'), 90, TILE, (g) => {
    g.fillStyle(t.water, 1).fillRect(0, 12, 90, TILE - 12);
    const pts: V[] = [];
    for (let x = 0; x <= 90; x += 5) pts.push(v(x, 12 + Math.sin((x / 90) * Math.PI * 2) * 3));
    g.fillStyle(t.water, 1).fillPoints([...pts, v(90, 20), v(0, 20)], true);
    g.lineStyle(4, COLORS.ink, 1).strokePoints(pts, false);
    g.fillStyle(0xffffff, 0.35).fillRect(14, 20, 16, 3).fillRect(56, 26, 20, 3);
  });
  make(scene, k('water-fill'), TILE, TILE, (g) => {
    g.fillStyle(t.water, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xffffff, 0.18).fillRect(8, 12, 14, 3).fillRect(26, 30, 12, 3);
  });
}

// ------------------------------------------------------------------ communes

export function generateTextures(scene: Phaser.Scene): void {
  for (const t of THEME_LIST) themeTextures(scene, t);

  // Planche
  make(scene, 'tile-plank', TILE, 16, (g) => {
    g.fillStyle(COLORS.wood, 1).fillRect(0, 0, TILE, 16);
    g.lineStyle(4, COLORS.ink, 1).strokeRect(2, 2, TILE - 4, 12);
    g.lineStyle(2, COLORS.ink, 1).lineBetween(8, 8, 18, 8);
  });
  // Caisse
  make(scene, 'tile-crate', TILE, TILE, (g) => {
    g.fillStyle(COLORS.crate, 1).fillRect(1, 1, TILE - 2, TILE - 2);
    g.lineStyle(4, COLORS.ink, 1).strokeRect(2, 2, TILE - 4, TILE - 4);
    g.lineStyle(3, COLORS.ink, 1).lineBetween(7, 7, TILE - 7, TILE - 7).lineBetween(TILE - 7, 7, 7, TILE - 7);
  });
  // Glace (solide et glissante)
  make(scene, 'tile-ice', TILE, TILE, (g) => {
    g.fillStyle(0xbfe7ff, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xdff3ff, 1).fillCircle(14, 14, 7).fillCircle(32, 32, 6);
    g.lineStyle(3, 0xffffff, 1).lineBetween(6, 38, 20, 24).lineBetween(26, 18, 38, 8);
  });
  make(scene, 'tile-ice-top', TILE, TILE, (g) => {
    g.fillStyle(0xbfe7ff, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xf2fbff, 1).fillRect(0, 0, TILE, 11);
    g.lineStyle(3, 0xffffff, 1).lineBetween(8, 6, 20, 6).lineBetween(28, 20, 40, 14);
    g.fillStyle(0xdff3ff, 1).fillCircle(30, 34, 6);
  });
  // Lave : surface qui ondule + remplissage
  make(scene, 'lava-top', 90, TILE, (g) => {
    const pts: V[] = [];
    for (let x = 0; x <= 90; x += 5) pts.push(v(x, 10 + Math.sin((x / 90) * Math.PI * 2) * 4));
    g.fillStyle(0xf28c28, 1).fillRect(0, 14, 90, TILE - 14);
    g.fillPoints([...pts, v(90, 20), v(0, 20)], true);
    g.fillStyle(0xffd23f, 1).fillRect(0, 12, 90, 5);
    g.lineStyle(4, COLORS.ink, 1).strokePoints(pts, false);
    g.fillStyle(0xe63b2e, 1).fillCircle(20, 30, 6).fillCircle(66, 34, 8);
    g.lineStyle(3, COLORS.ink, 1).strokeCircle(20, 30, 6).strokeCircle(66, 34, 8);
  });
  make(scene, 'lava-fill', TILE, TILE, (g) => {
    g.fillStyle(0xf28c28, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xe63b2e, 1).fillCircle(12, 14, 6).fillCircle(32, 32, 7);
    g.lineStyle(3, COLORS.ink, 1).strokeCircle(12, 14, 6).strokeCircle(32, 32, 7);
  });
  // Sables mouvants
  make(scene, 'sand-top', TILE, TILE, (g) => {
    g.fillStyle(0xe2c27a, 1).fillRect(0, 8, TILE, TILE - 8);
    g.fillStyle(0xcaa65c, 1).fillCircle(10, 24, 3).fillCircle(30, 20, 2.5).fillCircle(22, 36, 3);
    g.lineStyle(4, COLORS.ink, 1).lineBetween(0, 8, TILE, 8);
  });
  make(scene, 'sand-fill', TILE, TILE, (g) => {
    g.fillStyle(0xd6b56a, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0xbf9a50, 1).fillCircle(12, 14, 3).fillCircle(32, 30, 3);
  });
  // Pont de lianes (planche tenue par des lianes) et planche pourrie
  make(scene, 'frag-forest', TILE, 18, (g) => {
    g.fillStyle(0xc89a5e, 1).fillRect(0, 2, TILE, 14);
    g.lineStyle(4, COLORS.ink, 1).strokeRect(2, 3, TILE - 4, 12);
    g.lineStyle(3, 0x4fa33a, 1).lineBetween(8, 3, 14, 15).lineBetween(30, 3, 24, 15);
    g.fillStyle(0x6cc04a, 1).fillCircle(8, 3, 4).fillCircle(31, 3, 4);
  });
  make(scene, 'frag-rotten', TILE, 18, (g) => {
    g.fillStyle(0x8a7352, 1).fillRect(0, 2, TILE, 14);
    g.lineStyle(4, COLORS.ink, 1).strokeRect(2, 3, TILE - 4, 12);
    g.lineStyle(3, COLORS.ink, 1).lineBetween(14, 3, 18, 9).lineBetween(18, 9, 12, 15).lineBetween(32, 3, 28, 10);
    g.fillStyle(0x5a4a30, 1).fillRect(36, 8, 5, 4);
  });
  make(scene, 'frag-stone', TILE, 20, (g) => {
    g.fillStyle(0x9a8a7a, 1).fillRect(0, 2, TILE, 16);
    g.lineStyle(4, COLORS.ink, 1).strokeRect(2, 3, TILE - 4, 14);
    g.lineStyle(3, COLORS.ink, 1).lineBetween(18, 3, 22, 10).lineBetween(22, 10, 16, 16);
    g.fillStyle(0xf28c28, 1).fillRect(30, 6, 8, 3);
  });
  // Nénuphar
  make(scene, 'lily', 54, 24, (g) => {
    g.fillStyle(0x6cc04a, 1).fillEllipse(27, 14, 50, 16);
    g.lineStyle(4, COLORS.ink, 1).strokeEllipse(27, 14, 50, 16);
    g.fillStyle(0x4fa33a, 1).fillTriangle(27, 14, 52, 8, 52, 16);
    g.fillStyle(0xff8fc7, 1).fillCircle(18, 8, 5);
    g.lineStyle(3, COLORS.ink, 1).strokeCircle(18, 8, 5);
  });
  // Herse (porte de l'arène)
  make(scene, 'gate', TILE, TILE, (g) => {
    g.fillStyle(0x6b7c92, 1).fillRect(4, 0, 8, TILE).fillRect(18, 0, 8, TILE).fillRect(32, 0, 8, TILE);
    g.lineStyle(3, COLORS.ink, 1).strokeRect(4, 0, 8, TILE).strokeRect(18, 0, 8, TILE).strokeRect(32, 0, 8, TILE);
    g.fillStyle(0x4a4f5a, 1).fillRect(0, 18, TILE, 8);
    g.lineStyle(3, COLORS.ink, 1).strokeRect(0, 18, TILE, 8);
  });
  // Drapeaux de sauvegarde
  for (const [key, color] of [['flag-off', 0x9aa8b2], ['flag-on', COLORS.tomato]] as const) {
    make(scene, key, 60, 104, (g) => {
      g.lineStyle(5, COLORS.ink, 1).lineBetween(8, 6, 8, 104);
      g.fillStyle(color, 1).fillTriangle(8, 6, 54, 20, 8, 34);
      g.lineStyle(4, COLORS.ink, 1).strokeTriangle(8, 6, 54, 20, 8, 34);
    });
  }
  // Nuage
  make(scene, 'cloud', 140, 80, (g) => {
    blob(g, [[34, 46, 24], [64, 32, 28], [96, 46, 22], [64, 52, 22]], 0xffffff, 5);
  });
  // Étoile blanche qui tourne derrière les objets à ramasser
  make(scene, 'glow', 72, 72, (g) => {
    const pts: V[] = [];
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 22 : 33;
      const a = (i * Math.PI) / 8;
      pts.push(v(36 + Math.cos(a) * r, 36 + Math.sin(a) * r));
    }
    g.fillStyle(0xffffff, 0.6).fillPoints(pts, true);
  });
  // Trame de points « impression BD » (fond des cases)
  make(scene, 'bg-dots', 14, 14, (g) => {
    g.fillStyle(0xffffff, 0.24).fillCircle(7, 7, 2);
  });
  // Particule (débris, gouttes)
  make(scene, 'dot', 12, 12, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 4);
  });
  // Projectiles : gelée, boule de neige, boule de feu, rocher
  make(scene, 'goo', 30, 30, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(15, 15, 14);
    g.fillStyle(COLORS.goo, 1).fillCircle(15, 15, 11);
    g.fillStyle(0xf3a6db, 1).fillCircle(11, 11, 3.5);
  });
  make(scene, 'snowball', 34, 34, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(17, 17, 16);
    g.fillStyle(0xffffff, 1).fillCircle(17, 17, 13);
    g.fillStyle(0xcfe6f7, 1).fillCircle(21, 21, 6);
  });
  make(scene, 'fireball', 38, 38, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(19, 19, 18);
    g.fillStyle(COLORS.tomato, 1).fillCircle(19, 19, 15);
    g.fillStyle(0xf28c28, 1).fillCircle(19, 19, 10);
    g.fillStyle(COLORS.banana, 1).fillCircle(19, 19, 5);
  });
  make(scene, 'rock', 46, 42, (g) => {
    poly(g, [[4, 30], [10, 10], [26, 2], [40, 12], [44, 32], [30, 40], [12, 40]], 0x8e9ba8, 4);
    g.lineStyle(3, COLORS.ink, 1).lineBetween(18, 12, 24, 22).lineBetween(30, 18, 34, 30);
  });
  // Cœur (points de vie du boss)
  make(scene, 'heart', 30, 28, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(9, 9, 9).fillCircle(21, 9, 9).fillTriangle(1, 12, 29, 12, 15, 27);
    g.fillStyle(COLORS.tomato, 1).fillCircle(9, 9, 6).fillCircle(21, 9, 6).fillTriangle(4, 12, 26, 12, 15, 24);
  });
  make(scene, 'heart-empty', 30, 28, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(9, 9, 9).fillCircle(21, 9, 9).fillTriangle(1, 12, 29, 12, 15, 27);
    g.fillStyle(COLORS.locked, 1).fillCircle(9, 9, 6).fillCircle(21, 9, 6).fillTriangle(4, 12, 26, 12, 15, 24);
  });
}
