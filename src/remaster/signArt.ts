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

/** A shaggy Highland cow face with a fringe and long curved horns. */
function highlandCow(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Long upswept horns.
  ctx.strokeStyle = '#f1e2b0';
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 46, cy - 24);
    ctx.quadraticCurveTo(cx + dir * 100, cy - 20, cx + dir * 96, cy - 74);
    ctx.stroke();
  }
  // Shaggy ears.
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(cx + dir * 56, cy - 8);
    ctx.rotate(dir * 1.2);
    ellipse(ctx, 0, 0, 12, 26, '#b5501f', '#5a230c');
    ctx.restore();
  }
  // Long ginger head, fringe over the eyes, pale muzzle.
  ellipse(ctx, cx, cy + 6, 52, 66, '#c8642a', '#5a230c');
  ctx.fillStyle = '#e07a35';
  ctx.beginPath();
  ctx.moveTo(cx - 50, cy - 30);
  for (let i = 0; i <= 8; i++) {
    ctx.lineTo(cx - 50 + i * 12.5, cy - 4 + (i % 2 ? 16 : -2));
  }
  ctx.lineTo(cx + 50, cy - 40);
  ctx.quadraticCurveTo(cx, cy - 70, cx - 50, cy - 30);
  ctx.fill();
  eyes(ctx, cx, cy + 4, 22, 9);
  ellipse(ctx, cx, cy + 46, 32, 24, '#e9c9a4', '#5a230c');
  ellipse(ctx, cx - 12, cy + 46, 5, 7, '#3a1a0a');
  ellipse(ctx, cx + 12, cy + 46, 5, 7, '#3a1a0a');
}

/** A tall clock tower (Big Ben) with a lit clock face, base at y. */
function clockTower(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  const w = h * 0.2;
  ctx.fillStyle = '#d8c48a';
  ctx.fillRect(x - w / 2, y - h * 0.75, w, h * 0.75);
  ctx.fillRect(x - w * 0.6, y - h * 0.86, w * 1.2, h * 0.14);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.6, y - h * 0.86);
  ctx.lineTo(x, y - h);
  ctx.lineTo(x + w * 0.6, y - h * 0.86);
  ctx.closePath();
  ctx.fill();
  circle(ctx, x, y - h * 0.66, w * 0.36, '#fff8dc', '#6b5a2a');
  ctx.strokeStyle = '#3a3218';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.66);
  ctx.lineTo(x, y - h * 0.66 - w * 0.26);
  ctx.moveTo(x, y - h * 0.66);
  ctx.lineTo(x + w * 0.18, y - h * 0.66);
  ctx.stroke();
}

/** Red-white-blue roundel with a bar, in the style of the Underground. */
function roundel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  circle(ctx, cx, cy, r, '#e32017');
  circle(ctx, cx, cy, r * 0.72, '#ffffff');
  ctx.fillStyle = '#0019a8';
  ctx.fillRect(cx - r * 1.25, cy - r * 0.2, r * 2.5, r * 0.4);
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
  'Scotland the Brave': (ctx) => {
    frame(ctx, '#005eb8', '#ffffff');
    // Saltire stripes behind the cow.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(W - 14, H - 14);
    ctx.moveTo(W - 14, 14);
    ctx.lineTo(14, H - 14);
    ctx.stroke();
    highlandCow(ctx, 112, 104);
    textLines(ctx, ['Scotland', 'the Brave'], 344, 84, 260, '#ffffff', 58);
    textLines(ctx, ['Haste ye back!'], 344, 156, 260, '#ffe08a', 28);
  },
  Belfast: (ctx) => {
    frame(ctx, '#7a1f2b', '#f4ecd0');
    // Cranes and the twin yellow gantries of the Belfast docks, plus a ship's hull.
    ctx.fillStyle = '#f2c230';
    for (const x of [52, 136]) {
      ctx.fillRect(x, 44, 8, 116);
      ctx.fillRect(x + 40, 44, 8, 116);
      ctx.fillRect(x - 6, 40, 62, 10);
      ctx.fillRect(x + 20, 74, 8, 4);
    }
    ctx.fillRect(40, 66, 130, 6);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(30, 150, 160, 18);
    textLines(ctx, ['Belfast'], 348, 82, 270, '#f4ecd0', 66);
    textLines(ctx, ['City of Titanic'], 348, 146, 270, '#f2c230', 30);
  },
  'London Calling': (ctx) => {
    frame(ctx, '#c8102e', '#ffffff');
    // A double-decker bus.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(28, 50, 150, 80);
    ctx.fillStyle = '#ea1f2f';
    ctx.fillRect(32, 54, 142, 72);
    ctx.fillStyle = '#ffe9a0';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(40 + i * 33, 62, 26, 18);
      ctx.fillRect(40 + i * 33, 92, 26, 18);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(32, 84, 142, 4);
    circle(ctx, 62, 132, 15, '#1a1a1a', '#cccccc');
    circle(ctx, 144, 132, 15, '#1a1a1a', '#cccccc');
    textLines(ctx, ['London', 'Calling!'], 344, 90, 260, '#ffffff', 64);
    textLines(ctx, ['Ta-ra for now'], 344, 154, 260, '#ffe08a', 26);
  },
  'Mind the Gap': (ctx) => {
    frame(ctx, '#1a1a2e', '#ffd21f');
    roundel(ctx, 100, 96, 56);
    ctx.fillStyle = '#ffd21f';
    for (let x = 200; x < 480; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 168);
      ctx.lineTo(x + 18, 168);
      ctx.lineTo(x + 36, 184);
      ctx.lineTo(x + 18, 184);
      ctx.closePath();
      ctx.fill();
    }
    textLines(ctx, ['MIND THE', 'GAP'], 340, 84, 250, '#ffffff', 60);
    textLines(ctx, ['London Underground'], 340, 148, 250, '#ffd21f', 26);
  },
  'Houses of Parliament': (ctx) => {
    frame(ctx, '#2a4a7a', '#f4ecd0');
    // Sky glow and the river.
    ctx.fillStyle = '#3f6aa3';
    ctx.fillRect(12, 140, W - 24, 40);
    ctx.fillStyle = '#e8d9a0';
    ctx.fillRect(28, 96, 230, 58);
    // Gothic spires along the Palace roofline.
    for (let x = 40; x < 250; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 96);
      ctx.lineTo(x + 8, 76);
      ctx.lineTo(x + 16, 96);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#b39a55';
    for (let x = 36; x < 250; x += 26) ctx.fillRect(x, 112, 10, 30);
    clockTower(ctx, 290, 154, 130);
    textLines(ctx, ['Houses of', 'Parliament'], 396, 84, 190, '#f4ecd0', 40);
    textLines(ctx, ['Westminster'], 396, 148, 190, '#ffd24a', 24);
  },
  Maspalomas: (ctx) => {
    frame(ctx, '#ff9d2e', '#fff1c2');
    // Sunset sky, a big sun with rays, then sea and sand across the whole board.
    const sky = ctx.createLinearGradient(0, 12, 0, 120);
    sky.addColorStop(0, '#ffcf4a');
    sky.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = sky;
    ctx.fillRect(12, 12, W - 24, H - 24);
    ctx.strokeStyle = '#fff3a8';
    ctx.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(70 + Math.cos(a) * 30, 50 + Math.sin(a) * 30);
      ctx.lineTo(70 + Math.cos(a) * 44, 50 + Math.sin(a) * 44);
      ctx.stroke();
    }
    circle(ctx, 70, 50, 24, '#fff6b0', '#ffe03a');
    ctx.fillStyle = '#2f8fc0';
    ctx.fillRect(12, 104, W - 24, 20);
    ctx.fillStyle = '#e8b04a';
    ctx.beginPath();
    ctx.moveTo(12, 180);
    ctx.lineTo(12, 124);
    ctx.quadraticCurveTo(256, 114, W - 12, 126);
    ctx.lineTo(W - 12, 180);
    ctx.closePath();
    ctx.fill();
    textLines(ctx, ['Maspalomas'], 330, 44, 300, '#4a1d12', 52);
    textLines(ctx, ['Gran Canaria'], 330, 86, 300, '#fff6c8', 26);

    ctx.save();
    ctx.translate(34, 56);
    ctx.scale(1.3, 1.3);
    // Striped beach towel.
    ['#e0303a', '#ffffff', '#1fa0a8', '#ffffff', '#e0303a'].forEach((c, i) => {
      const y0 = 76 + i * 3;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(8 - i * 1.6, y0);
      ctx.lineTo(236 - i * 1.6, y0);
      ctx.lineTo(236 - (i + 1) * 1.6, y0 + 3);
      ctx.lineTo(8 - (i + 1) * 1.6, y0 + 3);
      ctx.closePath();
      ctx.fill();
    });
    // Silhouette of a woman sunbathing on her side: head propped on one hand, curve of waist and
    // hip along the top, one leg stretched out and the other kicked up behind.
    const skin = '#4a1d12';
    ctx.strokeStyle = skin;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(30, 74);
    ctx.lineTo(38, 42);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(46, 36);
    ctx.lineTo(56, 46);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(182, 70);
    ctx.quadraticCurveTo(204, 62, 210, 42);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(210, 40);
    ctx.lineTo(220, 30);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(54, 46);
    ctx.bezierCurveTo(62, 48, 68, 52, 74, 56);
    ctx.bezierCurveTo(86, 62, 96, 66, 106, 64);
    ctx.bezierCurveTo(118, 46, 138, 42, 148, 56);
    ctx.bezierCurveTo(160, 62, 176, 64, 190, 66);
    ctx.bezierCurveTo(204, 66, 216, 70, 226, 72);
    ctx.lineTo(232, 76);
    ctx.lineTo(64, 77);
    ctx.bezierCurveTo(54, 72, 50, 60, 54, 46);
    ctx.closePath();
    ctx.fill();
    circle(ctx, 44, 32, 9, skin);
    // Long red hair over the top of her head, down her back and blowing out in the breeze.
    ctx.fillStyle = '#e04418';
    ctx.beginPath();
    ctx.moveTo(35, 30);
    ctx.bezierCurveTo(36, 18, 54, 18, 54, 30);
    ctx.bezierCurveTo(56, 38, 62, 44, 74, 50);
    ctx.bezierCurveTo(62, 52, 54, 46, 50, 38);
    ctx.bezierCurveTo(48, 32, 44, 28, 40, 28);
    ctx.bezierCurveTo(30, 30, 20, 20, 8, 24);
    ctx.bezierCurveTo(16, 14, 30, 18, 35, 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  Osnabruck: (ctx) => {
    frame(ctx, '#b3121f', '#ffffff');
    // The wheel from the city's coat of arms.
    circle(ctx, 100, 96, 66, '#ffffff', '#7d0c15');
    circle(ctx, 100, 96, 54, '#b3121f');
    circle(ctx, 100, 96, 44, '#ffffff');
    ctx.strokeStyle = '#b3121f';
    ctx.lineWidth = 7;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(100 - Math.cos(a) * 54, 96 - Math.sin(a) * 54);
      ctx.lineTo(100 + Math.cos(a) * 54, 96 + Math.sin(a) * 54);
      ctx.stroke();
    }
    circle(ctx, 100, 96, 14, '#b3121f', '#ffffff');
    textLines(ctx, ['Osnabrück'], 336, 78, 290, '#ffffff', 58);
    textLines(ctx, ['Germany'], 336, 128, 290, '#ffd24a', 34);
    textLines(ctx, ['City of Peace'], 336, 162, 290, '#ffe0e0', 22);
  },
  'Hither Green Church': (ctx) => {
    frame(ctx, '#7fb4e0', '#ffffff');
    // Grass, then a stone church: nave, tower with spire and a gothic door.
    ctx.fillStyle = '#5d9e4a';
    ctx.fillRect(12, 150, 200, 30);
    ctx.fillStyle = '#c9b48f';
    ctx.fillRect(40, 96, 110, 58);
    ctx.fillStyle = '#8a4b3a';
    ctx.beginPath();
    ctx.moveTo(34, 98);
    ctx.lineTo(95, 66);
    ctx.lineTo(156, 98);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8a27c';
    ctx.fillRect(150, 70, 40, 84);
    ctx.fillStyle = '#6e7a86';
    ctx.beginPath();
    ctx.moveTo(146, 72);
    ctx.lineTo(170, 18);
    ctx.lineTo(194, 72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a2a1a';
    ctx.beginPath();
    ctx.moveTo(158, 154);
    ctx.lineTo(158, 128);
    ctx.quadraticCurveTo(170, 112, 182, 128);
    ctx.lineTo(182, 154);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd24a';
    for (const x of [58, 86, 114]) {
      ctx.beginPath();
      ctx.moveTo(x, 138);
      ctx.lineTo(x, 116);
      ctx.quadraticCurveTo(x + 8, 104, x + 16, 116);
      ctx.lineTo(x + 16, 138);
      ctx.closePath();
      ctx.fill();
    }
    heart(ctx, 84, 40, 34, '#ff2d55');
    heart(ctx, 120, 30, 24, '#ffd1dc');
    textLines(ctx, ['Just Married'], 356, 58, 270, '#ffffff', 46);
    textLines(ctx, ['Hither Green', 'Church'], 356, 128, 270, '#1d3a6b', 36);
  },
  'Secret Club': (ctx) => {
    frame(ctx, '#0e0e0a', '#c9a24a');
    const gold = (y0: number, y1: number) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, '#fff2b0');
      g.addColorStop(0.45, '#d9a83a');
      g.addColorStop(0.55, '#8a5a14');
      g.addColorStop(1, '#f0c860');
      return g;
    };
    // A dark shield with a gold rim and a big gold S, in the style of the club's crest.
    const shield = () => {
      ctx.beginPath();
      ctx.moveTo(52, 34);
      ctx.quadraticCurveTo(116, 20, 180, 34);
      ctx.lineTo(186, 30);
      ctx.bezierCurveTo(192, 90, 170, 140, 116, 170);
      ctx.bezierCurveTo(62, 140, 40, 90, 46, 30);
      ctx.closePath();
    };
    shield();
    ctx.fillStyle = '#3a3a24';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = gold(24, 170);
    ctx.stroke();
    ctx.font = 'bold 120px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = gold(40, 150);
    ctx.strokeText('S', 116, 98);
    ctx.fillStyle = '#2a2a18';
    ctx.fillText('S', 116, 98);
    ctx.strokeText('S', 116, 98);
    // SECRET in bevelled gold capitals across the shield.
    ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a2408';
    ctx.strokeText('SECRET', 116, 98);
    ctx.fillStyle = gold(82, 114);
    ctx.fillText('SECRET', 116, 98);
    // Name and place.
    ctx.font = 'bold 52px Georgia, "Times New Roman", serif';
    ctx.lineWidth = 4;
    ctx.strokeText('Secret', 362, 58);
    ctx.fillStyle = gold(34, 82);
    ctx.fillText('Secret', 362, 58);
    ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
    ctx.strokeText('Club', 362, 104);
    ctx.fillStyle = gold(88, 120);
    ctx.fillText('Club', 362, 104);
    textLines(ctx, ['CITA Centre, Gran Canaria'], 362, 152, 250, '#e8d9a8', 20);
  },
  'Glastonbury Tor': (ctx) => {
    frame(ctx, '#2a3a6e', '#e8d9a8');
    // Twilight sky, crescent moon, the Tor with St Michael's tower on top.
    const sky = ctx.createLinearGradient(0, 12, 0, 180);
    sky.addColorStop(0, '#2a3a6e');
    sky.addColorStop(1, '#c47a9a');
    ctx.fillStyle = sky;
    ctx.fillRect(12, 12, W - 24, H - 24);
    circle(ctx, 60, 44, 16, '#fff4c8');
    circle(ctx, 68, 40, 14, '#3a4a7c');
    ctx.fillStyle = '#3d6b3a';
    ctx.beginPath();
    ctx.moveTo(12, 180);
    ctx.bezierCurveTo(40, 170, 80, 96, 120, 92);
    ctx.bezierCurveTo(160, 96, 200, 160, 240, 170);
    ctx.lineTo(240, 180);
    ctx.closePath();
    ctx.fill();
    // Terraces ringing the hill.
    ctx.strokeStyle = '#2e5530';
    ctx.lineWidth = 2;
    for (const y of [120, 140, 160]) {
      ctx.beginPath();
      ctx.ellipse(120, y, (y - 90) * 1.05, 6, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(112, 56, 16, 40);
    ctx.beginPath();
    ctx.moveTo(110, 58);
    ctx.lineTo(120, 46);
    ctx.lineTo(130, 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a2418';
    ctx.fillRect(117, 80, 6, 16);
    textLines(ctx, ['Glastonbury', 'Tor'], 370, 82, 230, '#fff4c8', 50);
    textLines(ctx, ['Somerset'], 372, 154, 250, '#ffd8e8', 24);
  },
  'Double R Club': (ctx) => {
    // Red velvet curtains over a zig-zag floor.
    frame(ctx, '#140404', '#c9a24a');
    ctx.save();
    ctx.beginPath();
    ctx.rect(12, 12, W - 24, H - 24);
    ctx.clip();
    for (let i = 0; i < 12; i++) {
      const x = 12 + i * 41;
      ctx.fillStyle = i % 2 === 0 ? '#b00010' : '#8a000c';
      ctx.fillRect(x, 12, 41, 126);
    }
    for (let i = 0; i < 20; i++) {
      const x = 12 + i * 26;
      for (let row = 0; row < 3; row++) {
        ctx.fillStyle = (i + row) % 2 === 0 ? '#111111' : '#f4f0e6';
        ctx.beginPath();
        const y = 138 + row * 14;
        ctx.moveTo(x, y);
        ctx.lineTo(x + 13, y + 7);
        ctx.lineTo(x + 26, y);
        ctx.lineTo(x + 26, y + 14);
        ctx.lineTo(x + 13, y + 21);
        ctx.lineTo(x, y + 14);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    textLines(ctx, ['The Double R Club'], 256, 60, 440, '#ffe9a8', 54);
    textLines(ctx, ['Cabaret'], 256, 110, 440, '#ffffff', 30);
  },
  Peterborough: (ctx) => {
    frame(ctx, '#e8dcc0', '#1d3a6b');
    // The cathedral's west front: three great arches between towers.
    ctx.fillStyle = '#c9ae7a';
    ctx.fillRect(28, 60, 180, 112);
    ctx.fillStyle = '#b89a62';
    for (const x of [22, 190]) {
      ctx.fillRect(x, 36, 24, 136);
      ctx.beginPath();
      ctx.moveTo(x, 36);
      ctx.lineTo(x + 12, 16);
      ctx.lineTo(x + 24, 36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#3a2a1a';
    for (const [x, w] of [
      [52, 36],
      [100, 36],
      [148, 36],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, 172);
      ctx.lineTo(x, 100);
      ctx.quadraticCurveTo(x + w / 2, 62, x + w, 100);
      ctx.lineTo(x + w, 172);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#b89a62';
    for (const x of [70, 118, 166]) {
      ctx.beginPath();
      ctx.moveTo(x - 16, 60);
      ctx.lineTo(x, 40);
      ctx.lineTo(x + 16, 60);
      ctx.closePath();
      ctx.fill();
    }
    textLines(ctx, ['Peterborough'], 368, 70, 260, '#1d3a6b', 50);
    textLines(ctx, ['Where it all began'], 368, 126, 260, '#8a4b3a', 26);
  },
  'Shy London': (ctx) => {
    frame(ctx, '#ffe7ef', '#6a4cc2');
    // The group's blushing smiley: orange ball, eyes glancing aside, rosy cheeks.
    const [x, y, r] = [118, 96, 72];
    const ball = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    ball.addColorStop(0, '#ffe24a');
    ball.addColorStop(0.6, '#ffb000');
    ball.addColorStop(1, '#f07800');
    circle(ctx, x, y, r, '#ffb000', '#8a4a10');
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
    ctx.fill();
    for (const dx of [-0.58, 0.58]) {
      const blush = ctx.createRadialGradient(
        x + dx * r,
        y + r * 0.2,
        0,
        x + dx * r,
        y + r * 0.2,
        r * 0.22
      );
      blush.addColorStop(0, 'rgba(240,30,30,0.85)');
      blush.addColorStop(1, 'rgba(240,60,30,0)');
      ctx.fillStyle = blush;
      ctx.fillRect(x + dx * r - r * 0.25, y - r * 0.05, r * 0.5, r * 0.5);
    }
    for (const dx of [-0.28, 0.28]) {
      ellipse(ctx, x + dx * r, y - r * 0.2, r * 0.19, r * 0.22, '#ffffff', '#6a3a10');
      circle(ctx, x + dx * r - r * 0.05, y - r * 0.16, r * 0.13, '#111111');
      circle(ctx, x + dx * r - r * 0.09, y - r * 0.22, r * 0.035, '#ffffff');
    }
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y + r * 0.22);
    ctx.quadraticCurveTo(x - r * 0.02, y + r * 0.62, x + r * 0.3, y + r * 0.2);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5a2e0c';
    ctx.stroke();
    textLines(ctx, ['Shy London'], 366, 70, 260, '#6a4cc2', 56);
    textLines(ctx, ['For socially anxious', 'Londoners'], 366, 136, 260, '#c2447a', 24);
  },
  'Curzon Soho': (ctx) => {
    frame(ctx, '#161616', '#d9b45a');
    // A film strip behind a steaming cup of coffee.
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(24, 40, 200, 90);
    ctx.fillStyle = '#d9b45a';
    for (let x = 30; x < 220; x += 18) {
      ctx.fillRect(x, 46, 10, 8);
      ctx.fillRect(x, 116, 10, 8);
    }
    ctx.fillStyle = '#3d3d3d';
    for (const x of [34, 100, 166]) ctx.fillRect(x, 60, 52, 50);
    ctx.strokeStyle = '#f4ecd0';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const dx of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(124 + dx, 100);
      ctx.bezierCurveTo(118 + dx, 90, 130 + dx, 84, 124 + dx, 72);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(94, 108);
    ctx.lineTo(154, 108);
    ctx.lineTo(148, 160);
    ctx.lineTo(100, 160);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(156, 128, 12, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ellipse(ctx, 124, 166, 44, 7, '#d9b45a');
    ctx.fillStyle = '#6b3a1e';
    ctx.fillRect(98, 110, 52, 6);
    textLines(ctx, ['CURZON'], 364, 62, 236, '#d9b45a', 58);
    textLines(ctx, ['Shaftesbury Avenue'], 364, 112, 236, '#f4ecd0', 26);
    textLines(ctx, ['Shy London coffees'], 364, 150, 236, '#ff9ec0', 22);
  },
  "Penderel's Oak": (ctx) => {
    frame(ctx, '#1f4a2c', '#d9b45a');
    // A great oak tree beside a pint of ale.
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(80, 100, 22, 72);
    ctx.beginPath();
    ctx.moveTo(80, 172);
    ctx.lineTo(70, 180);
    ctx.lineTo(112, 180);
    ctx.lineTo(102, 172);
    ctx.fill();
    for (const [x, y, r] of [
      [60, 88, 34],
      [124, 88, 34],
      [92, 60, 40],
      [70, 50, 26],
      [118, 48, 26],
      [92, 100, 30],
    ]) {
      circle(ctx, x, y, r, '#3f8a3a');
    }
    for (const [x, y] of [
      [64, 70],
      [110, 64],
      [130, 96],
      [80, 98],
    ]) {
      ellipse(ctx, x, y, 5, 7, '#b8862e');
      ctx.fillStyle = '#6b4a1e';
      ctx.fillRect(x - 5, y - 8, 10, 4);
    }
    // Pint glass.
    ctx.fillStyle = '#c9771e';
    ctx.beginPath();
    ctx.moveTo(172, 80);
    ctx.lineTo(214, 80);
    ctx.lineTo(208, 168);
    ctx.lineTo(178, 168);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff4d8';
    ctx.beginPath();
    ctx.moveTo(170, 66);
    ctx.lineTo(216, 66);
    ctx.lineTo(214, 84);
    ctx.lineTo(172, 84);
    ctx.closePath();
    ctx.fill();
    circle(ctx, 180, 66, 8, '#fff4d8');
    circle(ctx, 196, 62, 10, '#fff4d8');
    circle(ctx, 210, 66, 7, '#fff4d8');
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(182, 90, 6, 70);
    textLines(ctx, ["Penderel's", 'Oak'], 364, 80, 236, '#f4ecd0', 52);
    textLines(ctx, ['Holborn'], 364, 154, 236, '#d9b45a', 26);
  },
  'Ye Olde Cheshire Cheese': (ctx) => {
    frame(ctx, '#1a1a1a', '#e8dcc0');
    // A bowl of sticky toffee pudding with sauce running down and a dollop of cream.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(120, 140, 92, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b3514';
    ctx.beginPath();
    ctx.moveTo(62, 138);
    ctx.lineTo(70, 76);
    ctx.quadraticCurveTo(120, 60, 170, 76);
    ctx.lineTo(178, 138);
    ctx.quadraticCurveTo(120, 152, 62, 138);
    ctx.fill();
    // Toffee sauce on top, dripping down the sides and pooling.
    ctx.fillStyle = '#b8661c';
    ctx.beginPath();
    ctx.ellipse(120, 76, 50, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, len] of [
      [78, 38],
      [96, 58],
      [122, 30],
      [144, 64],
      [164, 44],
    ]) {
      ctx.fillRect(x - 5, 76, 10, len);
      circle(ctx, x, 76 + len, 6, '#b8661c');
    }
    ctx.beginPath();
    ctx.ellipse(120, 146, 70, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, 110, 62, 16, '#fff8e8');
    circle(ctx, 126, 58, 14, '#fff8e8');
    circle(ctx, 118, 48, 10, '#fff8e8');
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(74, 90, 5, 30);
    textLines(ctx, ['Ye Olde', 'Cheshire Cheese'], 364, 68, 236, '#e8dcc0', 40);
    textLines(ctx, ['Sticky toffee pudding'], 364, 138, 236, '#e8a24a', 24);
    textLines(ctx, ['Fleet Street'], 364, 164, 236, '#9a9a8a', 18);
  },
};

/** Draws a custom sign; returns false if `brand` is not one of the custom signs. */
export function drawCustomSign(ctx: CanvasRenderingContext2D, brand: string): boolean {
  const draw = (DRAWERS as Record<string, Drawer | undefined>)[brand];
  if (!draw) return false;
  draw(ctx);
  return true;
}
