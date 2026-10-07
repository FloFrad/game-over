// Case de BD illustrée pour chaque mort : une image qui se comprend sans lire
// (écrasé sous l'enclume → tête de mort, glissade → peau de banane géante, etc.).
// Affichée en grand juste avant le menu « Rejouer » (ResultScene), en vignette dans l'album.
//
// Ajouter une mort = une entrée dans data/deaths.ts + une entrée dans ARTS ci-dessous
// (sans dessin, la mort reçoit une case générique : héros + fantôme + crâne).
//
// Tout est dessiné dans un conteneur centré sur (0, 0) de PANEL_W × PANEL_H, à partir des sprites
// SVG « Big » (rasterisés finement). Rien ne dépasse du cadre : Phaser ne permet pas de découper.

import Phaser from 'phaser';
import { BIG_SPRITES, COLORS, CSS, FONT_DISPLAY, type BigSpriteKey } from '../config';
import { DEATH_BY_ID, type DeathId } from '../data/deaths';

export const PANEL_W = 560;
export const PANEL_H = 360;
const HW = PANEL_W / 2;
const HH = PANEL_H / 2;
/** Ligne du sol dans les cases « en extérieur ». */
const GROUND = 118;

type Pt = [number, number];
/** Cercle : x, y, rayon. */
type Circle = [number, number, number];

interface Ctx {
  scene: Phaser.Scene;
  box: Phaser.GameObjects.Container;
  /** true pour la grande case (onomatopée qui « pop »), false pour les vignettes. */
  animate: boolean;
}

interface Art {
  /** Couleur de fond et couleur des rayons (style planche de BD). */
  bg: [number, number];
  draw: (c: Ctx) => void;
}

// ------------------------------------------------------------------ outils de dessin

function gfx(c: Ctx, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  const g = c.scene.add.graphics();
  draw(g);
  c.box.add(g);
}

interface PicOptions {
  /** Point d'ancrage dans l'image (défaut : bas, au milieu). */
  ox?: number;
  oy?: number;
  angle?: number;
  flip?: boolean;
  sx?: number;
  sy?: number;
  tint?: number;
}

/** Sprite « Big » posé en (x, y). `k` = taille relative au jeu (1 = taille normale en niveau). */
function pic(c: Ctx, key: BigSpriteKey, x: number, y: number, k: number, o: PicOptions = {}): Phaser.GameObjects.Image {
  const s = k / BIG_SPRITES[key];
  const img = c.scene.add
    .image(x, y, `${key}Big`)
    .setOrigin(o.ox ?? 0.5, o.oy ?? 1)
    .setScale(s * (o.sx ?? 1), s * (o.sy ?? 1))
    .setAngle(o.angle ?? 0)
    .setFlipX(!!o.flip);
  if (o.tint !== undefined) img.setTint(o.tint);
  c.box.add(img);
  return img;
}

function blobShape(c: Ctx, x: number, y: number, w: number, h: number, fill: number, alpha = 1): Phaser.GameObjects.Ellipse {
  const e = c.scene.add.ellipse(x, y, w, h, fill, alpha).setStrokeStyle(4, COLORS.ink);
  c.box.add(e);
  return e;
}

function star(c: Ctx, x: number, y: number, r: number, rot = 0, fill: number = COLORS.banana): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
  }
  gfx(c, (g) => g.fillStyle(fill, 1).fillPoints(pts, true).lineStyle(3, COLORS.ink, 1).strokePoints(pts, true));
}

function heart(c: Ctx, x: number, y: number, s: number): void {
  const r = s * 0.27;
  gfx(c, (g) => {
    for (const [pad, col] of [[3, COLORS.ink], [0, COLORS.tomato]] as const) {
      g.fillStyle(col, 1);
      g.fillCircle(x - r, y, r + pad).fillCircle(x + r, y, r + pad);
      g.fillTriangle(x - s / 2 - pad + 1, y + r * 0.3, x + s / 2 + pad - 1, y + r * 0.3, x, y + s * 0.62 + pad);
    }
  });
}

/** Trait de vitesse : blanc avec contour noir. */
function whoosh(c: Ctx, pts: Pt[]): void {
  gfx(c, (g) => {
    for (const [w, col] of [[10, COLORS.ink], [5, 0xffffff]] as const) {
      g.lineStyle(w, col, 1);
      for (let i = 0; i < pts.length; i += 2) g.lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    }
  });
}

type GroundKind = 'forest' | 'swamp' | 'ice' | 'lava';
const GROUNDS: Record<GroundKind, { dirt: number; dark: number; top: number }> = {
  forest: { dirt: COLORS.dirt, dark: COLORS.dirtDark, top: COLORS.grass },
  swamp: { dirt: 0x6b5a3a, dark: 0x4f432c, top: 0x5a8a3e },
  ice: { dirt: 0x8e9ba8, dark: 0x76828f, top: 0xffffff },
  lava: { dirt: 0x4a3a40, dark: 0x33272d, top: 0xf28c28 },
};

function ground(c: Ctx, y = GROUND, kind: GroundKind = 'forest'): void {
  const k = GROUNDS[kind];
  gfx(c, (g) => {
    g.fillStyle(k.dirt, 1).fillRect(-HW, y, PANEL_W, HH - y);
    g.fillStyle(k.dark, 1);
    for (let x = -HW + 30; x < HW; x += 76) g.fillCircle(x, y + 34 + ((x * 7) % 18), 6);
    g.fillStyle(k.top, 1).fillRect(-HW, y, PANEL_W, 14);
    g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, y, HW, y);
  });
}

/** Mini nuage blanc. */
function cloud(c: Ctx, x: number, y: number, s = 1): void {
  blobShape(c, x, y, 70 * s, 34 * s, 0xffffff);
  blobShape(c, x + 24 * s, y - 12 * s, 50 * s, 34 * s, 0xffffff);
  blobShape(c, x - 20 * s, y - 6 * s, 40 * s, 28 * s, 0xffffff);
  gfx(c, (g) => g.fillStyle(0xffffff, 1).fillEllipse(x + 2 * s, y + 2 * s, 66 * s, 26 * s)); // cache les contours intérieurs
}

/** Bulle de pensée avec un crâne dedans : « ça y est, c'est fini ». */
function skullBubble(c: Ctx, x: number, y: number, rx: number, ry: number, trail: Circle[]): void {
  for (const [tx, ty, tr] of trail) blobShape(c, tx, ty, tr * 2, tr * 2, 0xffffff);
  blobShape(c, x, y, rx * 2, ry * 2, 0xffffff);
  pic(c, 'skull', x, y + ry * 0.62, (ry * 1.35) / 60);
}

/** Onomatopée dans une étoile blanche, façon BD. */
function sfxBurst(c: Ctx, text: string, x: number, y: number, size: number, color: string, angle = -4): void {
  const t = c.scene.add
    .text(0, 0, text, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${size}px`,
      color,
      stroke: CSS.ink,
      strokeThickness: Math.max(5, Math.round(size * 0.2)),
      align: 'center',
    })
    .setOrigin(0.5);
  const rx = t.width * 0.62 + 22;
  const ry = t.height * 0.55 + 8;
  // L'étoile reste entièrement dans le cadre (rien ne peut être découpé)
  const grp = c.scene.add
    .container(Phaser.Math.Clamp(x, -HW + rx + 8, HW - rx - 8), Phaser.Math.Clamp(y, -HH + ry + 8, HH - ry - 8))
    .setAngle(angle);
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 ? 0.8 : 1;
    const a = (i * Math.PI) / 12;
    pts.push(new Phaser.Math.Vector2(Math.cos(a) * rx * r, Math.sin(a) * ry * r));
  }
  const g = c.scene.add.graphics();
  g.fillStyle(0xffffff, 1).fillPoints(pts, true).lineStyle(5, COLORS.ink, 1).strokePoints(pts, true);
  grp.add([g, t]);
  c.box.add(grp);
  if (c.animate) {
    grp.setScale(0.2);
    c.scene.tweens.add({ targets: grp, scale: 1, duration: 280, delay: 200, ease: 'Back.Out' });
  }
}

/** Le petit fantôme à auréole qui flotte doucement. */
function ghost(c: Ctx, x: number, y: number, k: number): void {
  const img = pic(c, 'ghost', x, y, k, { oy: 0.5 });
  c.scene.tweens.add({ targets: img, y: y - 10, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
}

// ------------------------------------------------------------------ fond : rayons façon BD

type Poly = Pt[];

/** Découpe un polygone convexe par un demi-plan (Sutherland–Hodgman). */
function clipHalf(poly: Poly, inside: (p: Pt) => boolean, cross: (a: Pt, b: Pt) => Pt): Poly {
  const out: Poly = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ia = inside(a);
    if (ia) out.push(a);
    if (ia !== inside(b)) out.push(cross(a, b));
  }
  return out;
}

function clipToPanel(poly: Poly): Poly {
  const atX = (x: number) => (a: Pt, b: Pt): Pt => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const atY = (y: number) => (a: Pt, b: Pt): Pt => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  let p = clipHalf(poly, (q) => q[0] >= -HW, atX(-HW));
  p = clipHalf(p, (q) => q[0] <= HW, atX(HW));
  p = clipHalf(p, (q) => q[1] >= -HH, atY(-HH));
  return clipHalf(p, (q) => q[1] <= HH, atY(HH));
}

function background(c: Ctx, base: number, light: number): void {
  gfx(c, (g) => {
    g.fillStyle(base, 1).fillRect(-HW, -HH, PANEL_W, PANEL_H);
    g.fillStyle(light, 1);
    const n = 16;
    const R = 900;
    for (let i = 0; i < n; i += 2) {
      const a0 = (i * 2 * Math.PI) / n;
      const a1 = ((i + 1) * 2 * Math.PI) / n;
      const poly = clipToPanel([[0, 0], [Math.cos(a0) * R, Math.sin(a0) * R], [Math.cos(a1) * R, Math.sin(a1) * R]]);
      if (poly.length >= 3) g.fillPoints(poly.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
    }
  });
  c.box.add(c.scene.add.tileSprite(0, 0, PANEL_W, PANEL_H, 'bg-dots'));
}

// ------------------------------------------------------------------ une case par mort

const ARTS: Partial<Record<DeathId, Art>> = {
  // Le Gloumpf serre le héros dans ses bras (pas de sang : de la gelée rose et des cœurs)
  colle: {
    bg: [0xff8fc7, 0xffb3dc],
    draw: (c) => {
      ground(c);
      pic(c, 'hero', -75, GROUND + 4, 2.3, { tint: 0xf3a6db });
      for (const [x, y, r] of [[-95, 78, 17], [-66, 46, 13], [-104, 24, 11], [-72, 100, 12], [-30, 66, 10]]) blobShape(c, x, y, r * 2, r * 1.8, COLORS.goo);
      pic(c, 'gloumpf', 62, GROUND + 4, 4.4, { flip: true });
      heart(c, 212, -10, 30);
      heart(c, 238, -62, 22);
      ghost(c, -110, -102, 1.5);
      sfxBurst(c, 'SCHLOURP !', 135, -135, 48, CSS.pink);
    },
  },

  // Tête la première dans l'eau, entre deux murs de terre
  plongeon: {
    bg: [0x7ec8f0, 0xa6dbf6],
    draw: (c) => {
      cloud(c, -110, -140, 0.9);
      cloud(c, 150, -150, 0.7);
      // les deux bords du trou
      gfx(c, (g) => {
        for (const [x0, x1] of [[-HW, -205], [205, HW]] as const) {
          g.fillStyle(COLORS.dirt, 1).fillRect(x0, -50, x1 - x0, HH + 50);
          g.fillStyle(COLORS.dirtDark, 1).fillCircle((x0 + x1) / 2, 40, 7).fillCircle((x0 + x1) / 2 + 10, 120, 6);
          g.fillStyle(COLORS.grass, 1).fillRect(x0, -50, x1 - x0, 14);
          g.lineStyle(5, COLORS.ink, 1).lineBetween(x0, -50, x1, -50);
        }
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-205, -50, -205, HH).lineBetween(205, -50, 205, HH);
      });
      // le héros tombe la tête en bas, la tête déjà dans l'eau
      pic(c, 'hero', 0, -85, 2.4, { angle: 180 });
      whoosh(c, [[-80, -160], [-80, -100], [-50, -170], [-50, -115], [52, -170], [52, -110], [82, -160], [82, -105]]);
      // l'eau passe devant la tête
      gfx(c, (g) => {
        g.fillStyle(COLORS.water, 0.92).fillRect(-205, 70, 410, HH - 70);
        g.lineStyle(5, COLORS.ink, 1).beginPath().moveTo(-205, 70);
        for (let x = -205; x <= 205; x += 10) g.lineTo(x, 70 + Math.sin(x * 0.09) * 4);
        g.strokePath();
        g.lineStyle(3, 0xffffff, 0.8).strokeCircle(-70, 130, 7).strokeCircle(-40, 150, 5).strokeCircle(80, 125, 8).strokeCircle(55, 158, 5);
      });
      for (const [x, y, r] of [[-62, 56, 13], [-30, 40, 10], [0, 30, 8], [30, 40, 10], [62, 56, 13]]) blobShape(c, x, y, r * 2, r * 2, 0xffffff);
      sfxBurst(c, 'AAAAH…\nPLOC', 125, -125, 36, '#FFFFFF');
    },
  },

  // Les pieds en l'air au-dessus d'une énorme peau de banane
  banane: {
    bg: [0xa9ddb0, 0xc6ecca],
    draw: (c) => {
      ground(c);
      gfx(c, (g) => g.fillStyle(COLORS.ink, 0.18).fillEllipse(72, GROUND + 10, 150, 18));
      pic(c, 'peel', -100, GROUND + 4, 4.6);
      whoosh(c, [[-34, -22], [28, -22], [-52, 8], [18, 8], [-34, 38], [28, 38]]);
      pic(c, 'hero', 85, 15, 2.4, { angle: -72, oy: 0.5 });
      star(c, -165, -45, 20, 0.3);
      star(c, -20, -80, 15, -0.2);
      star(c, 190, -70, 17, 0.5);
      sfxBurst(c, 'ZIOUUU !', -60, -122, 54, CSS.banana);
    },
  },

  // Géant sous un plafond trop bas : bosse, étoiles et crâne
  bonk: {
    bg: [0xff9d8f, 0xffbab0],
    draw: (c) => {
      ground(c);
      // le plafond de roche
      gfx(c, (g) => {
        g.fillStyle(COLORS.dirt, 1).fillRect(-HW, -HH, PANEL_W, HH - 2);
        g.fillStyle(COLORS.dirtDark, 1);
        for (let x = -HW + 24; x < HW; x += 64) g.fillCircle(x, -150 + (Math.abs(x * 11) % 90), 8);
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, -2, HW, -2);
        g.lineStyle(4, COLORS.ink, 1).beginPath().moveTo(-60, -2).lineTo(-78, -40).lineTo(-54, -68).lineTo(-74, -110).strokePath();
        g.beginPath().moveTo(-38, -2).lineTo(-20, -34).lineTo(-36, -60).strokePath();
      });
      pic(c, 'hero', -60, GROUND + 4, 3.0, { sy: 0.62, sx: 1.12 });
      for (let i = 0; i < 3; i++) star(c, -60 + Math.cos(i * 2.1) * 92, 28 + Math.sin(i * 2.1) * 14, 15, i);
      skullBubble(c, 165, 20, 88, 66, [[95, 76, 13], [72, 100, 8]]);
      sfxBurst(c, 'BONK !', 70, -95, 62, CSS.banana);
    },
  },

  // Aplati comme une crêpe, l'enclume posée dessus
  enclume: {
    bg: [0xc9d3da, 0xdde4e9],
    draw: (c) => {
      ground(c);
      pic(c, 'hero', -10, GROUND + 4, 2.6, { sy: 0.22, sx: 1.25 });
      blobShape(c, -205, 100, 54, 28, 0xffffff);
      blobShape(c, 195, 104, 60, 30, 0xffffff);
      pic(c, 'anvil', -10, 86, 3.0);
      c.box.add(
        c.scene.add.text(-6, 4, '100 KG', { fontFamily: FONT_DISPLAY, fontSize: '34px', color: '#FFFFFF' }).setOrigin(0.5),
      );
      star(c, -228, 50, 17, 0.4);
      star(c, 224, 62, 15, -0.3);
      ghost(c, -228, -45, 1.1);
      skullBubble(c, 205, -118, 62, 46, [[150, -66, 8], [133, -46, 5]]);
      sfxBurst(c, 'CLONG !', -20, -132, 52, CSS.banana);
    },
  },

  // Dans le bec d'un grand oiseau, suspendu par le casque
  oiseau: {
    bg: [0xffc38a, 0xffd9b0],
    draw: (c) => {
      cloud(c, -200, 120, 1);
      cloud(c, 215, -90, 0.8);
      pic(c, 'hero', 84, 88, 1.9, { angle: 8 });
      pic(c, 'bird', -50, -28, 3.4, { oy: 0.5 });
      for (const [x, y, a] of [[-150, 78, 30], [-105, 112, -40], [-175, 128, 70], [40, 118, -20]]) {
        const f = c.scene.add.ellipse(x, y, 36, 14, x % 2 ? COLORS.water : 0x7b5cc4).setStrokeStyle(3, COLORS.ink).setAngle(a);
        c.box.add(f);
      }
      for (const [x, y] of [[160, 10], [170, 42]]) blobShape(c, x, y, 12, 18, 0x7ec8f0);
      sfxBurst(c, 'MIAM !', 135, -128, 56, CSS.banana);
    },
  },

  // Éternué dans les airs par le Ronchon
  ronchon: {
    bg: [0x9db3cc, 0xb8c9dc],
    draw: (c) => {
      ground(c);
      pic(c, 'ronchon', -78, GROUND + 6, 1.25);
      for (const [x, y, r] of [[-60, 6, 9], [-30, -4, 7], [0, 10, 11], [28, -10, 8], [58, 4, 6]]) blobShape(c, x, y, r * 2, r * 2, 0xbfe6fa);
      whoosh(c, [[-50, -22], [30, -40], [-45, 30], [40, 22], [20, -20], [80, -50]]);
      pic(c, 'hero', 175, -55, 1.9, { angle: 130, oy: 0.5 });
      blobShape(c, 85, -42, 20, 20, 0xffffff);
      blobShape(c, 118, -62, 14, 14, 0xffffff);
      star(c, 232, -120, 17, 0.2);
      star(c, 110, -135, 14, -0.4);
      star(c, 225, 20, 13, 0.7);
      sfxBurst(c, 'ATCHOUM !', -25, -135, 52, CSS.banana);
    },
  },

  // ------------------------------------------------------------ monde 1 (suite)

  // Un essaim d'abeilles à la poursuite du héros
  abeilles: {
    bg: [0xffd23f, 0xffe58a],
    draw: (c) => {
      ground(c);
      pic(c, 'beehive', -190, GROUND - 70, 2.6, { angle: -8 });
      for (const [x, y, r] of [[-120, 40, 5], [-90, 70, 5], [-60, 44, 5], [-30, 78, 5]]) blobShape(c, x, y, r * 2, r * 2, 0xffffff, 0.8);
      pic(c, 'hero', 80, GROUND + 4, 2.4, { angle: 14 });
      for (const [x, y, f] of [[-40, -20, 1], [20, -70, -1], [-60, 30, 1], [120, -80, -1], [150, -20, 1], [40, 10, -1], [10, -120, 1]] as const) {
        pic(c, 'bee', x, y, 3.3, { oy: 0.5, flip: f < 0 });
      }
      star(c, 190, 10, 14, 0.3);
      star(c, 40, -45, 12, 0.1);
      ghost(c, 190, -90, 1.2);
      sfxBurst(c, 'BZZZ…\nAÏE !', -85, -105, 44, CSS.banana);
    },
  },

  // Propulsé si haut par le champignon rose que le héros sort de l'écran
  champignon: {
    bg: [0x7ec8f0, 0xa6dbf6],
    draw: (c) => {
      cloud(c, -170, -50, 1);
      cloud(c, 190, 20, 0.8);
      ground(c);
      pic(c, 'mushroomWild', -40, GROUND + 6, 3.0, { sx: 1.25, sy: 0.72 });
      whoosh(c, [[40, -10], [40, 60], [90, -20], [90, 60], [140, -10], [140, 50]]);
      pic(c, 'hero', 200, -70, 1.6, { angle: 180, oy: 0.5 });
      star(c, 150, -140, 15, 0.2);
      star(c, 250, -125, 12, -0.3);
      blobShape(c, -40, 10, 20, 20, 0xffffff);
      blobShape(c, -75, 30, 14, 14, 0xffffff);
      sfxBurst(c, 'BOOOING !', 5, -125, 54, CSS.banana);
    },
  },

  // Le pont de lianes se déchire : le héros tombe avec les planches
  liane: {
    bg: [0x7ec8f0, 0xa6dbf6],
    draw: (c) => {
      cloud(c, -120, -140, 0.8);
      gfx(c, (g) => {
        for (const [x0, x1] of [[-HW, -190], [190, HW]] as const) {
          g.fillStyle(COLORS.dirt, 1).fillRect(x0, -20, x1 - x0, HH + 20);
          g.fillStyle(COLORS.grass, 1).fillRect(x0, -20, x1 - x0, 14);
          g.lineStyle(5, COLORS.ink, 1).lineBetween(x0, -20, x1, -20).lineBetween(x0 < 0 ? x1 : x0, -20, x0 < 0 ? x1 : x0, HH);
        }
        // lianes déchirées
        g.lineStyle(9, COLORS.ink, 1).lineBetween(-190, -20, -120, 20).lineBetween(190, -20, 120, 20);
        g.lineStyle(5, 0x4fa33a, 1).lineBetween(-190, -20, -120, 20).lineBetween(190, -20, 120, 20);
      });
      for (const [x, y, a] of [[-130, 40, 25], [-60, 90, -40], [70, 60, 55], [135, 20, -20]]) {
        const pl = c.scene.add.rectangle(x, y, 78, 18, 0xc89a5e).setStrokeStyle(4, COLORS.ink).setAngle(a);
        c.box.add(pl);
      }
      pic(c, 'hero', 0, 20, 2.2, { angle: 170, oy: 0.5 });
      whoosh(c, [[-40, -130], [-40, -70], [20, -140], [20, -90], [60, -130], [60, -75]]);
      sfxBurst(c, 'CRAC…\nPLOUF !', 135, -110, 40, '#FFFFFF');
    },
  },

  // Maman Gloumpf : un câlin géant, gluant, avec des bébés Gloumpfs qui regardent
  maman: {
    bg: [0xff8fc7, 0xffb3dc],
    draw: (c) => {
      ground(c);
      pic(c, 'hero', -100, GROUND + 4, 2.1, { tint: 0xf3a6db, sx: 0.8 });
      pic(c, 'gloumpf', 55, GROUND + 4, 5.0, { flip: true });
      for (const [x, y, r] of [[-130, 80, 15], [-90, 52, 12], [-60, 96, 12], [-150, 36, 10]]) blobShape(c, x, y, r * 2, r * 1.8, COLORS.goo);
      pic(c, 'gloumpf', -215, GROUND + 4, 1.5);
      pic(c, 'gloumpf', 235, GROUND + 4, 1.2, { flip: true });
      heart(c, 205, -60, 34);
      heart(c, 240, -105, 22);
      heart(c, 160, -120, 18);
      ghost(c, -100, -70, 1.4);
      sfxBurst(c, 'SCHLOUUURP !', 70, -135, 42, CSS.pink);
    },
  },

  // ------------------------------------------------------------ monde 2

  // Quand on est tout petit, un escargot, c'est une montagne
  escargot: {
    bg: [0xc7dca2, 0xdbe9bd],
    draw: (c) => {
      ground(c, GROUND, 'swamp');
      pic(c, 'snail', 70, GROUND + 4, 6.0);
      pic(c, 'hero', -175, GROUND + 4, 1.0, { sy: 0.5, sx: 1.4 });
      star(c, -180, 60, 12, 0.3);
      star(c, -120, 85, 9, 0.7);
      blobShape(c, -150, 20, 22, 22, 0xffffff);
      blobShape(c, -126, -5, 14, 14, 0xffffff);
      ghost(c, -210, -40, 1.0);
      sfxBurst(c, 'SPLATCH !', -85, -125, 48, CSS.banana);
    },
  },

  // Les sables mouvants avalent le héros : il ne reste que le casque
  sables: {
    bg: [0xe6dd7a, 0xf1ecb0],
    draw: (c) => {
      gfx(c, (g) => {
        g.fillStyle(0xd6b56a, 1).fillRect(-HW, 20, PANEL_W, HH - 20);
        g.fillStyle(0xbf9a50, 1);
        for (let x = -HW + 25; x < HW; x += 55) g.fillCircle(x, 60 + ((x * 5) % 70), 4);
      });
      pic(c, 'hero', 0, 90, 2.6);
      gfx(c, (g) => {
        // le sable recouvre le héros jusqu'au casque
        g.fillStyle(0xe2c27a, 1).fillEllipse(0, 52, 200, 54);
        g.lineStyle(5, COLORS.ink, 1).strokeEllipse(0, 52, 200, 54);
        g.fillStyle(0xcaa65c, 1).fillEllipse(0, 60, 150, 26);
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, 20, -140, 20).lineBetween(140, 20, HW, 20);
      });
      for (const [x, y, r] of [[-70, 30, 12], [-100, 0, 8], [75, 35, 13], [110, 5, 9]]) blobShape(c, x, y, r * 2, r * 2, 0xe2c27a);
      pic(c, 'ghost', 150, -50, 1.5, { oy: 0.5 });
      sfxBurst(c, 'GLOUP !', 20, -120, 66, CSS.banana);
    },
  },

  // Le nénuphar coule : seul le casque dépasse de l'eau
  nenuphar: {
    bg: [0xc7dca2, 0xdbe9bd],
    draw: (c) => {
      cloud(c, -150, -120, 0.9);
      gfx(c, (g) => {
        g.fillStyle(0x4f7a56, 1).fillRect(-HW, 20, PANEL_W, HH - 20);
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, 20, HW, 20);
      });
      pic(c, 'hero', 10, 70, 2.2);
      gfx(c, (g) => {
        g.fillStyle(0x4f7a56, 0.88).fillRect(-HW, 20, PANEL_W, HH - 20);
        g.lineStyle(5, COLORS.ink, 1).beginPath().moveTo(-HW, 22);
        for (let x = -HW; x <= HW; x += 10) g.lineTo(x, 22 + Math.sin(x * 0.08) * 4);
        g.strokePath();
        g.lineStyle(3, 0xffffff, 0.8).strokeCircle(-70, 90, 7).strokeCircle(-45, 120, 5).strokeCircle(80, 100, 8).strokeCircle(55, 140, 5);
      });
      for (const [x, y, w, a] of [[-130, 22, 110, 0], [150, 24, 90, 12]]) {
        const lily = c.scene.add.ellipse(x, y, w, 24, 0x6cc04a).setStrokeStyle(4, COLORS.ink).setAngle(a);
        c.box.add(lily);
      }
      for (const [x, y] of [[-40, 2], [-20, -20], [50, -10]]) blobShape(c, x, y, 18, 18, 0xffffff);
      sfxBurst(c, 'BLOUP !', 110, -105, 62, '#FFFFFF');
    },
  },

  // La langue de la grenouille attrape le héros
  grenouille: {
    bg: [0xc7dca2, 0xdbe9bd],
    draw: (c) => {
      ground(c, GROUND, 'swamp');
      pic(c, 'frog', -135, GROUND + 4, 4.2);
      gfx(c, (g) => {
        g.lineStyle(20, COLORS.ink, 1).lineBetween(-70, 60, 155, 10);
        g.lineStyle(13, 0xff6f91, 1).lineBetween(-70, 60, 155, 10);
        g.fillStyle(COLORS.ink, 1).fillCircle(158, 8, 22);
        g.fillStyle(0xff6f91, 1).fillCircle(158, 8, 16);
      });
      pic(c, 'hero', 175, 18, 1.9, { angle: -75, oy: 0.5 });
      star(c, 95, -70, 15, 0.3);
      star(c, 245, -50, 12, -0.4);
      whoosh(c, [[100, -20], [150, -45], [95, 60], [135, 80]]);
      sfxBurst(c, 'SLURP !', 30, -125, 56, CSS.pink);
    },
  },

  // Un moustique géant : un petit bouton rouge et une bosse
  moustique: {
    bg: [0xc7dca2, 0xdbe9bd],
    draw: (c) => {
      ground(c, GROUND, 'swamp');
      pic(c, 'hero', 70, GROUND + 4, 2.4, { angle: -10 });
      pic(c, 'mosquito', -65, -20, 5.0, { oy: 0.5 });
      blobShape(c, 100, 28, 22, 18, 0xff8a8a);
      for (const [x, y, a] of [[140, -70, 0.3], [20, 60, -0.2]] as const) star(c, x, y, 13, a);
      whoosh(c, [[-20, 30], [30, 50], [-30, 70], [20, 90]]);
      ghost(c, 205, -60, 1.1);
      sfxBurst(c, 'PIIIK !', 120, -125, 56, CSS.banana);
    },
  },

  // Crapouille s'assoit sur le héros (plat comme une crêpe)
  crapouille: {
    bg: [0xc7dca2, 0xdbe9bd],
    draw: (c) => {
      ground(c, GROUND, 'swamp');
      pic(c, 'hero', 10, GROUND + 4, 2.6, { sy: 0.2, sx: 1.3 });
      pic(c, 'frog', 10, GROUND - 6, 4.8);
      whoosh(c, [[-215, 70], [-175, 70], [215, 70], [255, 70], [-200, 100], [-160, 100]]);
      for (const [x, y, r] of [[-150, 100, 12], [165, 104, 14], [-190, 80, 9]]) blobShape(c, x, y, r * 2, r * 2, 0xe8dcc0);
      star(c, -205, 20, 14, 0.3);
      star(c, 235, 10, 13, -0.2);
      ghost(c, 225, -70, 1.1);
      sfxBurst(c, 'BOUM…\nSPLOTCH !', -120, -130, 42, CSS.banana);
    },
  },

  // ------------------------------------------------------------ monde 3

  // Une glissade qui finit dans le vide
  glissade: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      gfx(c, (g) => {
        g.fillStyle(0xbfe7ff, 1).fillRect(-HW, 80, 300, HH - 80);
        g.fillStyle(0xf2fbff, 1).fillRect(-HW, 80, 300, 14);
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, 80, 20, 80).lineBetween(20, 80, 20, HH);
        g.lineStyle(3, 0xffffff, 1).lineBetween(-250, 120, -200, 105).lineBetween(-120, 140, -80, 125);
      });
      whoosh(c, [[-260, 40], [-170, 40], [-250, 60], [-130, 60], [-240, 20], [-150, 20]]);
      pic(c, 'hero', 55, 8, 2.3, { angle: 35, oy: 0.5 });
      gfx(c, (g) => g.lineStyle(5, COLORS.ink, 0.6).lineBetween(100, 70, 130, 130).lineBetween(130, 130, 90, 170));
      for (const [x, y] of [[-40, -60], [190, -70], [-190, -90]]) star(c, x, y, 10, 0.2, 0xffffff);
      sfxBurst(c, 'WIIIIIII !', 120, -125, 50, '#FFFFFF');
    },
  },

  // La stalactite plante le héros dans la glace
  stalactite: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      pic(c, 'hero', -10, GROUND + 4, 2.6, { sy: 0.25, sx: 1.2 });
      pic(c, 'stalactite', -10, GROUND + 14, 5.0, { oy: 1 });
      for (const [x, y, a] of [[-120, 70, 25], [110, 60, -30], [150, 100, 50], [-150, 100, -20]]) {
        const shard = c.scene.add.triangle(x, y, 0, 24, 12, 0, 24, 24, 0xcdeeff).setStrokeStyle(3, COLORS.ink).setAngle(a);
        c.box.add(shard);
      }
      star(c, -190, 20, 14, 0.3, 0xffffff);
      star(c, 205, 5, 12, -0.3, 0xffffff);
      ghost(c, -170, -75, 1.2);
      sfxBurst(c, 'CLING !', 100, -125, 60, '#CDEEFF');
    },
  },

  // La boule de neige de l'éternuement : héros tout blanc
  neige: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      pic(c, 'snowman', -150, GROUND + 4, 3.6, { sx: 1.12, sy: 0.92 });
      whoosh(c, [[-60, 10], [0, 10], [-65, 40], [-5, 40]]);
      pic(c, 'hero', 120, GROUND + 4, 2.4, { tint: 0xd8ecff });
      for (const [x, y, r] of [[85, 70, 24], [128, 30, 28], [160, 80, 20], [100, 10, 16], [150, -10, 14]]) blobShape(c, x, y, r * 2, r * 2, 0xffffff);
      star(c, 215, 0, 12, 0.3, 0xffffff);
      ghost(c, 205, -90, 1.2);
      sfxBurst(c, 'ATCHA…\nFLOUF !', 20, -118, 44, '#FFFFFF');
    },
  },

  // L'armure vide n'était pas vide : coup de gantelet
  armure: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      pic(c, 'hero', -80, GROUND + 4, 2.4, { sy: 0.7, sx: 1.15 });
      pic(c, 'armor', 95, GROUND + 4, 3.1, { flip: true });
      whoosh(c, [[-10, -60], [30, -90], [-20, -20], [30, -45]]);
      for (const [x, y, a] of [[-120, -10, 0.2], [-45, -30, 0.5], [-80, 10, -0.2]] as const) star(c, x, y, 13, a);
      ghost(c, -80, -90, 1.2);
      sfxBurst(c, 'CLANG !', -10, -130, 62, '#FFFFFF');
    },
  },

  // La boule renvoyée par la poêle revient sur le héros
  poele: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      pic(c, 'hero', -40, GROUND + 4, 2.4);
      pic(c, 'pan', 18, 28, 2.6, { oy: 0.5, angle: -30 });
      blobShape(c, 150, 20, 90, 80, 0xffffff);
      blobShape(c, 190, 55, 40, 36, 0xffffff);
      whoosh(c, [[100, 0], [150, -40], [105, 50], [160, 70]]);
      gfx(c, (g) => {
        g.lineStyle(6, COLORS.ink, 1).strokeCircle(30, 20, 40).strokeCircle(30, 20, 62);
        g.lineStyle(3, 0xffffff, 1).strokeCircle(30, 20, 40);
      });
      star(c, -150, -30, 14, 0.3);
      star(c, -110, 40, 11, 0.7);
      sfxBurst(c, 'BONG !', 60, -115, 66, CSS.banana);
    },
  },

  // La porte-bouche croque : il ne reste que le fantôme au casque
  porte: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      pic(c, 'doorMouth', -35, GROUND + 4, 2.7);
      for (const [x, y, r] of [[-130, 60, 10], [60, 50, 8], [-150, 20, 7]]) blobShape(c, x, y, r * 2, r * 2, 0xbfe6fa);
      ghost(c, 130, -40, 1.7);
      star(c, 215, 20, 14, 0.4);
      star(c, 20, -150, 12, 0.1);
      sfxBurst(c, 'CROUNCH !', -20, -150, 48, CSS.banana);
    },
  },

  // Gros Floc éternue une avalanche
  floc: {
    bg: [0xcfe3f5, 0xe6f1fb],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      pic(c, 'snowman', 125, GROUND + 4, 4.2, { flip: true });
      gfx(c, (g) => {
        g.fillStyle(0xffffff, 1).fillEllipse(-95, GROUND + 4, 260, 120);
        g.lineStyle(5, COLORS.ink, 1).strokeEllipse(-95, GROUND + 4, 260, 120);
      });
      whoosh(c, [[0, 0], [60, -20], [0, 40], [70, 30]]);
      for (const [x, y, r] of [[-30, -10, 22], [-150, -30, 16], [-100, 20, 18], [-190, 10, 12]]) blobShape(c, x, y, r * 2, r * 2, 0xffffff);
      pic(c, 'ghost', -100, -75, 1.4, { oy: 0.5 });
      sfxBurst(c, 'FLOUUUF !', -50, -135, 46, '#FFFFFF');
    },
  },

  // ------------------------------------------------------------ monde 4

  // Le héros tout carbonisé dans la lave
  lave: {
    bg: [0xe8601c, 0xf28c28],
    draw: (c) => {
      gfx(c, (g) => {
        g.fillStyle(0xf28c28, 1).fillRect(-HW, 40, PANEL_W, HH - 40);
        g.fillStyle(0xe63b2e, 1);
        for (const [x, y, r] of [[-190, 100, 22], [-40, 130, 26], [170, 90, 20], [90, 150, 16]]) g.fillCircle(x, y, r);
        g.fillStyle(0xffd23f, 1).fillRect(-HW, 38, PANEL_W, 8);
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, 40, HW, 40);
      });
      pic(c, 'hero', 0, 70, 2.5, { tint: 0x303030 });
      gfx(c, (g) => {
        g.fillStyle(0xf28c28, 0.95).fillEllipse(0, 66, 190, 40);
        g.lineStyle(5, COLORS.ink, 1).strokeEllipse(0, 66, 190, 40);
      });
      for (const [x, y, r] of [[-80, -10, 18], [-40, -60, 22], [60, -30, 20], [100, -90, 16], [20, -120, 14]]) blobShape(c, x, y, r * 2, r * 2, 0xffffff, 0.9);
      sfxBurst(c, 'PSCHHHT !', -10, -140, 50, CSS.banana);
    },
  },

  // Le dragon éternue une boule de feu : héros noirci, cheveux dressés
  dragon: {
    bg: [0xc03a3a, 0xd45a4a],
    draw: (c) => {
      ground(c, GROUND, 'lava');
      pic(c, 'dragon', -150, GROUND + 4, 3.8);
      gfx(c, (g) => {
        for (const [r, col] of [[46, COLORS.ink], [42, COLORS.tomato], [30, 0xf28c28], [16, COLORS.banana]] as const) g.fillStyle(col, 1).fillCircle(0, 30, r);
      });
      pic(c, 'hero', 130, GROUND + 4, 2.4, { tint: 0x2a2a2a });
      whoosh(c, [[-60, 30], [-100, 30], [-60, 60], [-95, 60]]);
      for (const [x, y, a] of [[120, -75, 0.2], [170, -50, -0.3], [75, -35, 0.6]] as const) star(c, x, y, 13, a, 0xffd23f);
      sfxBurst(c, 'ATCHAAA !', 40, -128, 52, CSS.banana);
    },
  },

  // Le boomerang revient en pleine figure
  boomerang: {
    bg: [0xffd9b0, 0xffe8c9],
    draw: (c) => {
      ground(c);
      pic(c, 'hero', -40, GROUND + 4, 2.6, { angle: -6 });
      pic(c, 'boomerang', -18, -4, 3.0, { oy: 0.5 });
      gfx(c, (g) => {
        g.lineStyle(6, COLORS.ink, 0.55);
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= 20; i++) {
          const u = i / 20;
          pts.push(new Phaser.Math.Vector2(230 - u * 250, -100 + Math.sin(u * Math.PI) * -35 + u * 90));
        }
        g.strokePoints(pts, false);
      });
      for (const [x, y, a] of [[-95, -70, 0.3], [30, -80, 0.7], [-120, 10, -0.3]] as const) star(c, x, y, 14, a);
      ghost(c, 160, -30, 1.2);
      sfxBurst(c, 'TOC !', 120, -120, 72, CSS.banana);
    },
  },

  // Le pont de pierre s'effondre au-dessus de la lave
  pont: {
    bg: [0xc03a3a, 0xd45a4a],
    draw: (c) => {
      gfx(c, (g) => {
        g.fillStyle(0xf28c28, 1).fillRect(-HW, 110, PANEL_W, HH - 110);
        g.fillStyle(0xffd23f, 1).fillRect(-HW, 108, PANEL_W, 6);
        g.lineStyle(5, COLORS.ink, 1).lineBetween(-HW, 110, HW, 110);
        for (const [x0, x1] of [[-HW, -170], [170, HW]] as const) {
          g.fillStyle(0x4a3a40, 1).fillRect(x0, -30, x1 - x0, 140);
          g.lineStyle(5, COLORS.ink, 1).strokeRect(x0, -30, x1 - x0, 140);
        }
      });
      for (const [x, y, a, w] of [[-120, -22, 8, 80], [-30, 20, -25, 80], [60, 60, 35, 70], [120, -10, -10, 70]]) {
        const slab = c.scene.add.rectangle(x, y, w, 22, 0x9a8a7a).setStrokeStyle(4, COLORS.ink).setAngle(a);
        c.box.add(slab);
      }
      pic(c, 'hero', 5, -45, 2.2, { angle: 150, oy: 0.5 });
      whoosh(c, [[-40, -150], [-40, -100], [30, -160], [30, -110]]);
      for (const [x, y, r] of [[-60, 90, 10], [90, 85, 12]]) blobShape(c, x, y, r * 2, r * 2, 0xffd23f);
      sfxBurst(c, 'CRAAAAC !', 110, -120, 44, CSS.banana);
    },
  },

  // Le coffre mord : les jambes du héros dépassent
  coffre: {
    bg: [0xffd9b0, 0xffe8c9],
    draw: (c) => {
      ground(c, GROUND, 'lava');
      pic(c, 'hero', 0, -52, 1.9, { angle: 180, oy: 0.5 });
      pic(c, 'mimic', 0, GROUND + 4, 3.6);
      for (const [x, y, a] of [[-150, -50, 0.3], [160, -30, -0.4], [-100, -110, 0.1]] as const) star(c, x, y, 14, a);
      pic(c, 'chest', -215, GROUND + 4, 1.2);
      sfxBurst(c, 'CHOMP !', 20, -140, 58, CSS.banana);
    },
  },

  // La massue du Ronchon écrase le héros ; les cailloux volent
  massue: {
    bg: [0x9db3cc, 0xb8c9dc],
    draw: (c) => {
      ground(c, GROUND, 'lava');
      pic(c, 'hero', 70, GROUND + 4, 2.4, { sy: 0.2, sx: 1.3 });
      pic(c, 'ronchonAwake', -105, GROUND + 6, 1.05);
      pic(c, 'club', 62, GROUND + 4, 1.25, { angle: -40, oy: 0.9 });
      for (const [x, y, r] of [[150, 70, 12], [200, 50, 10], [-20, 90, 11], [175, 100, 9]]) blobShape(c, x, y, r * 2, r * 1.8, 0x8e9ba8);
      whoosh(c, [[100, 30], [160, 10], [105, 70], [175, 80]]);
      star(c, 40, -25, 14, 0.3);
      ghost(c, 210, -30, 1.1);
      sfxBurst(c, 'BOUM !', 120, -125, 66, CSS.banana);
    },
  },

  // Le sauvetage raté : la princesse a appuyé sur le mauvais bouton, le héros tombe dans la trappe
  sauvetage: {
    bg: [0xff8fc7, 0xffb3dc],
    draw: (c) => {
      ground(c, GROUND, 'ice');
      gfx(c, (g) => g.fillStyle(COLORS.ink, 1).fillRect(-130, GROUND, 150, 80)); // la trappe ouverte
      pic(c, 'hero', -55, 20, 2.2, { angle: 190, oy: 0.5 });
      whoosh(c, [[-95, -120], [-95, -70], [-20, -125], [-20, -80]]);
      pic(c, 'princess', 150, GROUND + 4, 2.3);
      gfx(c, (g) => {
        g.fillStyle(0x8a8a8a, 1).fillRect(60, GROUND - 28, 50, 28);
        g.lineStyle(5, COLORS.ink, 1).strokeRect(60, GROUND - 28, 50, 28);
        g.fillStyle(COLORS.tomato, 1).fillCircle(85, GROUND - 38, 16);
        g.lineStyle(5, COLORS.ink, 1).strokeCircle(85, GROUND - 38, 16);
      });
      blobShape(c, 195, -75, 130, 56, 0xffffff);
      c.box.add(c.scene.add.text(195, -75, 'OUPS !', { fontFamily: FONT_DISPLAY, fontSize: '34px', color: CSS.ink }).setOrigin(0.5));
      heart(c, -190, -80, 26);
      sfxBurst(c, 'CLIC…\nAAAAH !', 10, -135, 40, CSS.pink);
    },
  },
};

/** Case générique pour une mort sans dessin dédié. */
const FALLBACK: Art = {
  bg: [0x7ec8f0, 0xa6dbf6],
  draw: (c) => {
    ground(c);
    pic(c, 'hero', -40, GROUND + 4, 2.3);
    star(c, -110, 20, 16);
    skullBubble(c, 120, -40, 80, 62, [[60, 20, 11], [42, 46, 7]]);
    ghost(c, -150, -80, 1.4);
  },
};

// ------------------------------------------------------------------ assemblage

/**
 * Construit la case de BD d'une mort : fond, dessin, étiquette « N° x » et cadre épais.
 * Le conteneur est centré sur (0, 0) ; l'appelant le place, l'incline et le met à l'échelle.
 */
export function buildDeathPanel(scene: Phaser.Scene, id: DeathId, animate = false): Phaser.GameObjects.Container {
  const box = scene.add.container(0, 0);
  const c: Ctx = { scene, box, animate };
  const art = ARTS[id] ?? FALLBACK;

  gfx(c, (g) => g.fillStyle(COLORS.ink, 1).fillRect(-HW + 10, -HH + 10, PANEL_W, PANEL_H)); // ombre portée
  background(c, art.bg[0], art.bg[1]);
  art.draw(c);

  // Étiquette jaune en haut à gauche, comme les encadrés des BD
  const tag = scene.add
    .text(-HW + 16, -HH + 14, `N° ${DEATH_BY_ID[id].n}`, { fontFamily: FONT_DISPLAY, fontSize: '26px', color: CSS.ink, padding: { x: 10, y: 2 } })
    .setOrigin(0, 0);
  gfx(c, (g) => {
    g.fillStyle(COLORS.banana, 1).fillRect(-HW, -HH, tag.width + 16 + 8, tag.height + 14 + 6);
    g.lineStyle(5, COLORS.ink, 1).strokeRect(-HW, -HH, tag.width + 16 + 8, tag.height + 14 + 6);
  });
  box.add(tag);

  gfx(c, (g) => g.lineStyle(8, COLORS.ink, 1).strokeRect(-HW, -HH, PANEL_W, PANEL_H));
  return box;
}
