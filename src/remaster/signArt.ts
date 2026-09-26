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
};

/** Draws a custom sign; returns false if `brand` is not one of the custom signs. */
export function drawCustomSign(ctx: CanvasRenderingContext2D, brand: string): boolean {
  const draw = (DRAWERS as Record<string, Drawer | undefined>)[brand];
  if (!draw) return false;
  draw(ctx);
  return true;
}
