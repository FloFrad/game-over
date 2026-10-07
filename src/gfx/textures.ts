// Textures générées au démarrage (décor et tuiles), dans le style de la planche :
// aplats de couleur + contour noir épais.

import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, TILE } from '../config';

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Contour noir puis remplissage : donne un « nuage » de cercles avec un seul contour extérieur. */
function blob(g: Phaser.GameObjects.Graphics, circles: [number, number, number][], fill: number, line = 4): void {
  g.fillStyle(COLORS.ink, 1);
  for (const [x, y, r] of circles) g.fillCircle(x, y, r + line);
  g.fillStyle(fill, 1);
  for (const [x, y, r] of circles) g.fillCircle(x, y, r);
}

function hills(g: Phaser.GameObjects.Graphics, h: number, base: number, amp: number, fill: number, seed: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let x = 0; x <= GAME_WIDTH; x += 8) {
    const t = (x / GAME_WIDTH) * Math.PI * 2; // périodique : la texture se répète sans couture
    const y = base - amp * (0.6 * Math.sin(2 * t + seed) + 0.4 * Math.sin(5 * t + seed * 2.3));
    pts.push(new Phaser.Math.Vector2(x, y));
  }
  g.fillStyle(fill, 1);
  g.fillPoints([...pts, new Phaser.Math.Vector2(GAME_WIDTH, h), new Phaser.Math.Vector2(0, h)], true);
  g.lineStyle(4, COLORS.ink, 1);
  g.strokePoints(pts, false);
}

export function generateTextures(scene: Phaser.Scene): void {
  // Sol avec herbe
  make(scene, 'tile-ground-top', TILE, TILE, (g) => {
    g.fillStyle(COLORS.dirt, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(COLORS.dirtDark, 1).fillCircle(14, 30, 5).fillCircle(33, 20, 4);
    g.fillStyle(COLORS.grass, 1).fillRect(0, 0, TILE, 12);
    for (let i = 0; i < 4; i++) g.fillCircle(5.6 + i * 11.25, 12, 5.6);
  });
  // Sol / roche sans herbe
  make(scene, 'tile-ground', TILE, TILE, (g) => {
    g.fillStyle(COLORS.dirt, 1).fillRect(0, 0, TILE, TILE);
    g.fillStyle(COLORS.dirtDark, 1).fillCircle(12, 14, 4).fillCircle(31, 31, 5);
  });
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
  // Drapeaux de sauvegarde
  for (const [key, color] of [['flag-off', 0x9aa8b2], ['flag-on', COLORS.tomato]] as const) {
    make(scene, key, 60, 104, (g) => {
      g.lineStyle(5, COLORS.ink, 1).lineBetween(8, 6, 8, 104);
      g.fillStyle(color, 1).fillTriangle(8, 6, 54, 20, 8, 34);
      g.lineStyle(4, COLORS.ink, 1).strokeTriangle(8, 6, 54, 20, 8, 34);
    });
  }
  // Arbre
  make(scene, 'tree', 150, 180, (g) => {
    g.fillStyle(COLORS.woodDark, 1).fillRect(64, 90, 22, 90);
    g.lineStyle(4, COLORS.ink, 1).strokeRect(64, 90, 22, 92);
    blob(g, [[75, 70, 38], [43, 86, 26], [107, 86, 26], [75, 40, 28]], 0x55aa40);
  });
  // Nuage
  make(scene, 'cloud', 140, 80, (g) => {
    blob(g, [[34, 46, 24], [64, 32, 28], [96, 46, 22], [64, 52, 22]], 0xffffff, 5);
  });
  // Soleil
  make(scene, 'sun', 150, 150, (g) => {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 28; i++) {
      const r = i % 2 ? 50 : 68;
      const a = (i * Math.PI) / 14;
      pts.push(new Phaser.Math.Vector2(75 + Math.cos(a) * r, 75 + Math.sin(a) * r));
    }
    g.fillStyle(0xffe58a, 1).fillPoints(pts, true);
    g.fillStyle(COLORS.ink, 1).fillCircle(75, 75, 44);
    g.fillStyle(COLORS.banana, 1).fillCircle(75, 75, 40);
  });
  // Collines (textures répétables pour le parallaxe)
  make(scene, 'hills-far', GAME_WIDTH, 300, (g) => hills(g, 300, 90, 40, 0xa9ddb0, 1.3));
  make(scene, 'hills-near', GAME_WIDTH, 300, (g) => hills(g, 300, 100, 48, 0x86c977, 4.1));
  // Particule (débris, gouttes)
  make(scene, 'dot', 12, 12, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 4);
  });
}
