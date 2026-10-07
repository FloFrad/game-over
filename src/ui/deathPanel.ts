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

function ground(c: Ctx, y = GROUND): void {
  gfx(c, (g) => {
    g.fillStyle(COLORS.dirt, 1).fillRect(-HW, y, PANEL_W, HH - y);
    g.fillStyle(COLORS.dirtDark, 1);
    for (let x = -HW + 30; x < HW; x += 76) g.fillCircle(x, y + 34 + ((x * 7) % 18), 6);
    g.fillStyle(COLORS.grass, 1).fillRect(-HW, y, PANEL_W, 14);
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
