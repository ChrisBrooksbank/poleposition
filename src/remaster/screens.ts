// screens - arcade-style 256x224 overlay screens drawn with Canvas 2D on top of the 3D scene.
import { NAME_ENTRY_LETTERS } from '../state/NameEntryState';
import type { HighScoreEntry } from '../state/HighScoreManager';

export const W = 256;
export const H = 224;

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'center'
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

function dim(ctx: CanvasRenderingContext2D, alpha: number): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const blink = (elapsed: number, period = 500) => Math.floor(elapsed / period) % 2 === 0;

export function drawTitle(ctx: CanvasRenderingContext2D, elapsed: number, topScore: number): void {
  dim(ctx, 0.5);
  text(ctx, 'POLE POSITION', W / 2, 62, 'bold 22px monospace', '#000');
  text(ctx, 'POLE POSITION', W / 2 - 1, 60, 'bold 22px monospace', '#ffdd00');
  text(ctx, 'R E M A S T E R E D', W / 2, 78, 'bold 8px monospace', '#ff5533');
  text(ctx, `TOP  ${String(topScore).padStart(6, '0')}`, W / 2, 104, '8px monospace', '#ffffff');
  if (blink(elapsed))
    text(ctx, 'PRESS ENTER TO START', W / 2, 132, 'bold 8px monospace', '#ffffff');
  text(ctx, 'ARROWS DRIVE   SHIFT GEAR', W / 2, 190, '6px monospace', '#aaaaaa');
  text(ctx, 'D - DIP SETTINGS', W / 2, 202, '6px monospace', '#777777');
}

export function drawDemoLabel(ctx: CanvasRenderingContext2D, elapsed: number): void {
  dim(ctx, 0.15);
  text(ctx, 'DEMO', W / 2, 12, '8px monospace', '#cccccc');
  if (blink(elapsed)) text(ctx, 'PRESS ENTER TO START', W / 2, 120, '8px monospace', '#ffffff');
}

export function drawCredit(ctx: CanvasRenderingContext2D): void {
  dim(ctx, 0.35);
  text(ctx, 'CREDIT  1', W / 2, H / 2, 'bold 10px monospace', '#ffffff');
}

export function drawBanner(ctx: CanvasRenderingContext2D, label: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 96, W, 22);
  text(ctx, label, W / 2, 112, 'bold 11px monospace', '#ffdd00');
}

export function drawGrid(ctx: CanvasRenderingContext2D, gridPosition: number): void {
  dim(ctx, 0.65);
  text(ctx, 'GRID POSITION', W / 2, H / 2 - 16, 'bold 11px monospace', '#ffdd00');
  const line = gridPosition > 0 ? `YOU ARE IN ${ordinal(gridPosition)}` : 'DID NOT QUALIFY';
  text(ctx, line, W / 2, H / 2 + 6, 'bold 9px monospace', '#ffffff');
  if (gridPosition === 1)
    text(ctx, 'POLE POSITION!', W / 2, H / 2 + 22, 'bold 9px monospace', '#ff5533');
}

export function drawRaceComplete(
  ctx: CanvasRenderingContext2D,
  remainingSecs: number,
  bonus: number,
  score: number
): void {
  dim(ctx, 0.65);
  text(ctx, 'RACE COMPLETE', W / 2, H / 2 - 24, 'bold 13px monospace', '#ffdd00');
  const f = 'bold 8px monospace';
  text(
    ctx,
    `TIME REMAINING  ${String(remainingSecs).padStart(3, ' ')} SEC`,
    W / 2,
    H / 2,
    f,
    '#fff'
  );
  text(ctx, `TIME BONUS  ${String(bonus).padStart(6, ' ')} PTS`, W / 2, H / 2 + 14, f, '#fff');
  text(ctx, `SCORE  ${String(score).padStart(6, '0')}`, W / 2, H / 2 + 28, f, '#fff');
}

export function drawGameOver(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'GAME OVER', W / 2, H / 2, 'bold 16px monospace', '#ff2222');
}

export interface NameEntryView {
  score: number;
  letterIndices: readonly number[];
  currentSlot: number;
  elapsed: number;
}

export function drawNameEntry(ctx: CanvasRenderingContext2D, v: NameEntryView): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'ENTER YOUR NAME', W / 2, 28, 'bold 9px monospace', '#ffdd00');
  text(ctx, `SCORE  ${String(v.score).padStart(6, '0')}`, W / 2, 46, '8px monospace', '#aaaaaa');
  const spacing = 20;
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - spacing + i * spacing;
    const letter = NAME_ENTRY_LETTERS[v.letterIndices[i] ?? 0] ?? 'A';
    const active = v.currentSlot === i;
    if (active) {
      ctx.fillStyle = '#ffdd00';
      ctx.fillRect(x - 7, 70, 14, 16);
    }
    text(ctx, letter, x, 83, 'bold 12px monospace', active ? '#000' : '#fff');
  }
  if (blink(v.elapsed, 600)) {
    text(ctx, '< > SELECT   ENTER CONFIRM', W / 2, 110, '6px monospace', '#888888');
  }
}

export function drawHighScores(
  ctx: CanvasRenderingContext2D,
  entries: readonly HighScoreEntry[],
  playerRank: number,
  initials: string
): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'HIGH SCORES', W / 2, 16, 'bold 9px monospace', '#ffdd00');
  entries.forEach((e, i) => {
    const rank = i + 1;
    const mine = rank === playerRank && e.initials === initials;
    const color = mine ? '#ffdd00' : rank <= 3 ? '#ffffff' : '#aaaaaa';
    const row = `${String(rank).padStart(2, ' ')}  ${e.initials}  ${String(e.score).padStart(6, '0')}`;
    text(ctx, row, 60, 32 + i * 14, `${mine ? 'bold ' : ''}8px monospace`, color, 'left');
  });
  if (entries.length === 0) text(ctx, 'NO SCORES YET', W / 2, H / 2, '8px monospace', '#aaaaaa');
}
