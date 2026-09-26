// signArt - hand-drawn artwork for the custom roadside signs (Canvas 2D, 512x192).
import { CUSTOM_SIGNS } from '../sim/scenery';

const W = 512;
const H = 192;

type Drawer = (ctx: CanvasRenderingContext2D) => void;

/** Draws text lines centred on (cx, cy), shrinking the font until the widest line fits. */
function textLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cx: number,
  cy: number,
  maxWidth: number,
  color: string,
  maxSize = 62
): void {
  let size = maxSize;
  const font = (px: number) =>
    `bold ${px}px "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif`;
  ctx.font = font(size);
  while (size > 14 && Math.max(...lines.map((l) => ctx.measureText(l).width)) > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = size * 1.12;
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, cy + (i - (lines.length - 1) / 2) * lineHeight);
  });
}

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function eyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, gap: number, r: number): void {
  for (const dx of [-gap, gap]) {
    circle(ctx, cx + dx, cy, r, '#ffffff', '#2b1a10');
    circle(ctx, cx + dx + r * 0.15, cy + r * 0.1, r * 0.5, '#1a1008');
    circle(ctx, cx + dx + r * 0.35, cy - r * 0.2, r * 0.18, '#ffffff');
  }
}

function smile(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, w, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2b1a10';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** A cartoon moose face with big antlers. */
function mooseFace(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Antlers: a thick sweeping arm on each side with three tines.
  for (const dir of [-1, 1]) {
    ctx.strokeStyle = '#e8cf9a';
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 38, cy - 40);
    ctx.quadraticCurveTo(cx + dir * 84, cy - 52, cx + dir * 86, cy - 92);
    ctx.stroke();
    ctx.lineWidth = 7;
    for (const [sx, sy, ex, ey] of [
      [56, -50, 70, -72],
      [74, -60, 96, -74],
      [82, -78, 78, -104],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dir * sx, cy + sy);
      ctx.lineTo(cx + dir * ex, cy + ey);
      ctx.stroke();
    }
  }
  // Ears.
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + dir * 58, cy - 26);
    ctx.rotate(dir * 0.7);
    ellipse(ctx, 0, 0, 12, 24, '#7a4b28', '#3a2412');
    ellipse(ctx, 0, 2, 6, 15, '#c98f6a');
    ctx.restore();
  }
  // Head, then the long pale muzzle.
  ellipse(ctx, cx, cy, 52, 58, '#8a5530', '#3a2412');
  ellipse(ctx, cx, cy + 34, 40, 34, '#c99a6a', '#3a2412');
  eyes(ctx, cx, cy - 12, 22, 11);
  // Nostrils and smile.
  ellipse(ctx, cx - 15, cy + 28, 6, 9, '#2b1a10');
  ellipse(ctx, cx + 15, cy + 28, 6, 9, '#2b1a10');
  smile(ctx, cx, cy + 38, 20);
  // A little dangling "bell" under the chin, like a real moose.
  ellipse(ctx, cx, cy + 70, 8, 12, '#6e4224', '#3a2412');
}

/** A cartoon monkey face. */
function monkeyFace(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Ears.
  for (const dir of [-1, 1]) {
    circle(ctx, cx + dir * 62, cy - 4, 26, '#7a4b28', '#3a2412');
    circle(ctx, cx + dir * 62, cy - 4, 15, '#f0b9a0');
  }
  // Head and the paler face mask.
  circle(ctx, cx, cy, 62, '#7a4b28', '#3a2412');
  // Heart-ish face mask from two lobes and a chin.
  ellipse(ctx, cx - 20, cy - 8, 27, 30, '#f3d3ae');
  ellipse(ctx, cx + 20, cy - 8, 27, 30, '#f3d3ae');
  ellipse(ctx, cx, cy + 22, 36, 30, '#f3d3ae');
  eyes(ctx, cx, cy - 10, 20, 11);
  // Nose and mouth.
  ellipse(ctx, cx - 7, cy + 12, 3.5, 5, '#5a3520');
  ellipse(ctx, cx + 7, cy + 12, 3.5, 5, '#5a3520');
  smile(ctx, cx, cy + 22, 22);
  // A tuft of hair.
  ctx.strokeStyle = '#3a2412';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 62);
  ctx.quadraticCurveTo(cx - 2, cy - 82, cx + 12, cy - 70);
  ctx.stroke();
}

function heart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(-90, -30, -45, -85, 0, -35);
  ctx.bezierCurveTo(45, -85, 90, -30, 0, 30);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#a3123a';
  ctx.stroke();
  ctx.restore();
}

/** A front-facing stag head with branching antlers; `body` colours the head, `horn` the antlers. */
function stagHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  body: string,
  horn: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.strokeStyle = horn;
  for (const dir of [-1, 1]) {
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(dir * 20, -34);
    ctx.quadraticCurveTo(dir * 62, -50, dir * 66, -100);
    ctx.stroke();
    ctx.lineWidth = 6;
    for (const [sx, sy, ex, ey] of [
      [36, -44, 24, -74],
      [54, -56, 84, -66],
      [64, -84, 48, -110],
    ]) {
      ctx.beginPath();
      ctx.moveTo(dir * sx, sy);
      ctx.lineTo(dir * ex, ey);
      ctx.stroke();
    }
  }
  ctx.fillStyle = body;
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(dir * 40, -22);
    ctx.rotate(dir * 0.9);
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Head tapering to the muzzle.
  ctx.beginPath();
  ctx.moveTo(-32, -30);
  ctx.quadraticCurveTo(-34, 14, -14, 52);
  ctx.quadraticCurveTo(0, 62, 14, 52);
  ctx.quadraticCurveTo(34, 14, 32, -30);
  ctx.quadraticCurveTo(0, -46, -32, -30);
  ctx.fill();
  ctx.fillStyle = horn;
  ctx.beginPath();
  ctx.ellipse(0, 50, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(dir * 15, -8, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A maple leaf, `size` being its half-height. */
function mapleLeaf(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string
): void {
  const pts = [
    [0, -1],
    [0.2, -0.6],
    [0.45, -0.7],
    [0.38, -0.25],
    [0.75, -0.4],
    [0.68, -0.15],
    [0.98, 0.05],
    [0.85, 0.15],
    [0.9, 0.5],
    [0.45, 0.4],
    [0.4, 0.65],
    [0.08, 0.55],
    [0.08, 0.95],
    [-0.08, 0.95],
    [-0.08, 0.55],
    [-0.4, 0.65],
    [-0.45, 0.4],
    [-0.9, 0.5],
    [-0.85, 0.15],
    [-0.98, 0.05],
    [-0.68, -0.15],
    [-0.75, -0.4],
    [-0.38, -0.25],
    [-0.45, -0.7],
    [-0.2, -0.6],
  ];
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(cx + x * size, cy + y * size);
    else ctx.lineTo(cx + x * size, cy + y * size);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A seax: the broken-backed single-edged blade on the Essex arms, pointing right. */
function seax(ctx: CanvasRenderingContext2D, x: number, y: number, len: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e9ecf2';
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(len * 0.55, -5);
  ctx.quadraticCurveTo(len * 0.9, -6, len, 4);
  ctx.quadraticCurveTo(len * 0.7, 6, len * 0.45, 6);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9a520';
  ctx.fillRect(-14, -8, 14, 16);
  ctx.fillRect(-2, -9, 5, 18);
  ctx.restore();
}

function frame(ctx: CanvasRenderingContext2D, bg: string, border: string): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = border;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, W - 12, H - 12);
}

const DRAWERS: Record<(typeof CUSTOM_SIGNS)[number], Drawer> = {
  'Monty the Moose': (ctx) => {
    frame(ctx, '#2f7d4f', '#f4ecd0');
    mooseFace(ctx, 118, 108);
    textLines(ctx, ['Monty', 'the Moose'], 340, 96, 250, '#fbf3d5');
  },
  'Lizzie & Chris': (ctx) => {
    frame(ctx, '#f06a9b', '#ffffff');
    heart(ctx, 66, 100, 70, '#ff2d55');
    heart(ctx, 446, 100, 70, '#ff2d55');
    heart(ctx, 118, 150, 34, '#ffd1dc');
    heart(ctx, 394, 150, 34, '#ffd1dc');
    textLines(ctx, ['Lizzie', '& Chris'], 256, 96, 250, '#ffffff', 68);
  },
  'George the Monkey': (ctx) => {
    frame(ctx, '#f2c744', '#5b3a1e');
    monkeyFace(ctx, 118, 104);
    textLines(ctx, ['George', 'the Monkey'], 340, 96, 250, '#4a2c14');
  },
  'Welcome to Chelmsford': (ctx) => {
    frame(ctx, '#1d3b6e', '#ffffff');
    // Cathedral tower and spire on the left.
    ctx.fillStyle = '#c9d3e6';
    ctx.fillRect(54, 84, 44, 78);
    ctx.fillRect(40, 150, 72, 14);
    ctx.beginPath();
    ctx.moveTo(50, 84);
    ctx.lineTo(76, 26);
    ctx.lineTo(102, 84);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d3b6e';
    ctx.fillRect(69, 100, 14, 26);
    textLines(ctx, ['Welcome to', 'Chelmsford'], 312, 86, 340, '#ffffff', 60);
    textLines(ctx, ['ESSEX'], 312, 152, 200, '#ffd24a', 28);
  },
  'Chelmsford, Essex': (ctx) => {
    frame(ctx, '#c4161c', '#ffffff');
    // The three seaxes of Essex, stacked.
    seax(ctx, 44, 60, 110);
    seax(ctx, 44, 96, 110);
    seax(ctx, 44, 132, 110);
    textLines(ctx, ['Chelmsford'], 336, 78, 300, '#ffffff', 60);
    textLines(ctx, ['Essex, England'], 336, 132, 300, '#ffe3a3', 34);
  },
  'Beaulieu Park': (ctx) => {
    frame(ctx, '#2c6b3f', '#f1e6c4');
    circle(ctx, 106, 100, 70, '#f1e6c4', '#1f4d2d');
    stagHead(ctx, 106, 112, 0.62, '#7a4b28', '#3a2412');
    textLines(ctx, ['Beaulieu', 'Park'], 336, 84, 270, '#f1e6c4', 64);
    textLines(ctx, ['Chelmsford'], 336, 152, 250, '#c8e2b0', 28);
  },
  'Deer Crossing': (ctx) => {
    frame(ctx, '#ffd21f', '#111111');
    stagHead(ctx, 96, 116, 0.6, '#111111', '#111111');
    textLines(ctx, ['DEER', 'CROSSING'], 330, 82, 280, '#111111', 60);
    textLines(ctx, ['Beaulieu Park'], 330, 152, 260, '#3a3a3a', 28);
  },
  'Home of Radio': (ctx) => {
    frame(ctx, '#15284b', '#f4ecd0');
    // A radio mast sending out waves.
    ctx.strokeStyle = '#f4ecd0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(70, 160);
    ctx.lineTo(90, 60);
    ctx.lineTo(110, 160);
    ctx.moveTo(78, 120);
    ctx.lineTo(102, 120);
    ctx.moveTo(84, 90);
    ctx.lineTo(96, 90);
    ctx.stroke();
    circle(ctx, 90, 52, 6, '#ff5a4a');
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 4;
    for (const r of [18, 32, 46]) {
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          90,
          52,
          r,
          dir < 0 ? Math.PI * 0.75 : -Math.PI * 0.25,
          dir < 0 ? Math.PI * 1.25 : Math.PI * 0.25
        );
        ctx.stroke();
      }
    }
    textLines(ctx, ['Chelmsford:', 'Home of Radio'], 330, 84, 330, '#f4ecd0', 56);
    textLines(ctx, ['Marconi  1898'], 330, 152, 250, '#ffd24a', 28);
  },
  'Toronto, Canada': (ctx) => {
    frame(ctx, '#e0e8f4', '#d52b1e');
    // Skyline with the CN Tower.
    ctx.fillStyle = '#4c6a92';
    ctx.fillRect(28, 128, 34, 40);
    ctx.fillRect(66, 108, 30, 60);
    ctx.fillRect(130, 120, 32, 48);
    ctx.fillRect(166, 138, 24, 30);
    ctx.fillStyle = '#2f4a75';
    ctx.fillRect(107, 30, 5, 138);
    ctx.beginPath();
    ctx.moveTo(98, 168);
    ctx.lineTo(107, 70);
    ctx.lineTo(112, 70);
    ctx.lineTo(121, 168);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, 109.5, 78, 14, 6, '#2f4a75');
    mapleLeaf(ctx, 456, 62, 30, '#d52b1e');
    textLines(ctx, ['Toronto'], 330, 74, 260, '#d52b1e', 64);
    textLines(ctx, ['Canada'], 330, 138, 260, '#26334a', 46);
  },
  'Oh Canada': (ctx) => {
    frame(ctx, '#d52b1e', '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(52, 24, 96, 144);
    ctx.fillRect(364, 24, 96, 144);
    mapleLeaf(ctx, 100, 96, 44, '#d52b1e');
    mapleLeaf(ctx, 412, 96, 44, '#d52b1e');
    textLines(ctx, ['Oh Canada!'], 256, 78, 190, '#ffffff', 46);
    heart(ctx, 256, 128, 40, '#ffffff');
    textLines(ctx, ['Toronto'], 256, 156, 190, '#ffe3e0', 24);
  },
};

/** Draws a custom sign; returns false if `brand` is not one of the custom signs. */
export function drawCustomSign(ctx: CanvasRenderingContext2D, brand: string): boolean {
  const draw = (DRAWERS as Record<string, Drawer | undefined>)[brand];
  if (!draw) return false;
  draw(ctx);
  return true;
}
