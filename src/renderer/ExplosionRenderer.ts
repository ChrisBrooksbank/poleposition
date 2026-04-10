/**
 * ExplosionRenderer — pixel-art explosion animation for crash events.
 *
 * Renders a 6-frame explosion sequence centred on the player car's screen
 * position.  Each frame advances roughly every 416 ms (2500 ms / 6 frames).
 *
 * Frame sequence:
 *   0 — white flash (initial impact)
 *   1 — large orange/yellow fireball
 *   2 — expanding fireball with debris
 *   3 — red outer ring, dark centre, scattered debris
 *   4 — grey smoke cloud
 *   5 — thinning smoke, clearing
 *
 * The explosion is drawn entirely with canvas 2D primitives — no external
 * assets required.
 */

import { EXPLOSION_FRAME_COUNT } from '../state/ExplosionState';
import { CAR_BOTTOM_Y, CAR_HEIGHT } from './PlayerCarRenderer';

/** Vertical centre of the explosion, aligned with the car sprite's centre. */
const EXPLOSION_CY = CAR_BOTTOM_Y - Math.floor(CAR_HEIGHT / 2);

// ---------------------------------------------------------------------------
// Per-frame drawing
// ---------------------------------------------------------------------------

function drawFrame0(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // White flash — largest radius, instant impact
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  // Bright yellow inner core
  ctx.fillStyle = '#ffff88';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrame1(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Orange/yellow fireball
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffbb00';
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffaa';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrame2(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Expanding fireball
  ctx.fillStyle = '#dd4400';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 2, 7, 0, Math.PI * 2);
  ctx.fill();

  // Debris pixels
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(cx + 16, cy - 4, 3, 3);
  ctx.fillRect(cx - 18, cy + 2, 3, 3);
  ctx.fillRect(cx + 6, cy - 16, 3, 3);
  ctx.fillRect(cx - 8, cy + 14, 3, 3);
}

function drawFrame3(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Red/orange outer ring, darker centre
  ctx.fillStyle = '#aa2200';
  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff4400';
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();

  // Dark burnt core
  ctx.fillStyle = '#331100';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Scattered debris, further out
  ctx.fillStyle = '#dd6600';
  ctx.fillRect(cx + 18, cy - 6, 3, 3);
  ctx.fillRect(cx - 20, cy + 4, 3, 3);
  ctx.fillRect(cx + 8, cy - 18, 3, 3);
  ctx.fillRect(cx - 10, cy + 16, 3, 3);
  ctx.fillRect(cx + 14, cy + 12, 2, 2);
  ctx.fillRect(cx - 15, cy - 12, 2, 2);
}

function drawFrame4(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Smoke cloud — grey, slightly irregular
  ctx.fillStyle = '#666666';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#888888';
  ctx.beginPath();
  ctx.arc(cx - 4, cy + 2, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#999999';
  ctx.beginPath();
  ctx.arc(cx + 3, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  // Remaining ember
  ctx.fillStyle = '#cc3300';
  ctx.fillRect(cx - 2, cy - 1, 4, 4);
}

function drawFrame5(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Thinning smoke, almost clear
  ctx.fillStyle = '#777777';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 4, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#999999';
  ctx.beginPath();
  ctx.arc(cx + 4, cy + 2, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.arc(cx, cy - 1, 5, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Draw dispatch table
// ---------------------------------------------------------------------------

type FrameDrawFn = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void;

const FRAME_DRAWS: FrameDrawFn[] = [
  drawFrame0,
  drawFrame1,
  drawFrame2,
  drawFrame3,
  drawFrame4,
  drawFrame5,
];

// Sanity check at module load time
if (FRAME_DRAWS.length !== EXPLOSION_FRAME_COUNT) {
  throw new Error(
    `ExplosionRenderer: FRAME_DRAWS length (${FRAME_DRAWS.length}) must equal EXPLOSION_FRAME_COUNT (${EXPLOSION_FRAME_COUNT})`
  );
}

// ---------------------------------------------------------------------------
// Public renderer
// ---------------------------------------------------------------------------

export class ExplosionRenderer {
  constructor(
    readonly width: number = 256,
    readonly height: number = 224
  ) {}

  /**
   * Render one frame of the explosion animation.
   *
   * @param ctx      Canvas 2D context.
   * @param playerX  Lateral road-space position (same units as PlayerCarRenderer).
   * @param frame    Animation frame index, 0 to EXPLOSION_FRAME_COUNT-1.
   */
  render(ctx: CanvasRenderingContext2D, playerX: number, frame: number): void {
    const clampedFrame = Math.max(0, Math.min(Math.floor(frame), EXPLOSION_FRAME_COUNT - 1));

    const cx = Math.round(this.width / 2 + playerX);
    const cy = EXPLOSION_CY;

    ctx.save();
    FRAME_DRAWS[clampedFrame](ctx, cx, cy);
    ctx.restore();
  }
}
