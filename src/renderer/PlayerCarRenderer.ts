/**
 * PlayerCarRenderer — draws the player's car sprite in rear-view perspective.
 *
 * The car is drawn as a simple pixel-art Formula-1 style vehicle seen from
 * behind.  Three steering states produce three distinct sprite shapes:
 *   - straight   : symmetric, driving straight ahead
 *   - left       : body shifted / angled for a left turn
 *   - right      : body shifted / angled for a right turn
 *
 * Position:
 *   - Fixed screen Y near the bottom of the viewport.
 *   - Horizontal centre offset by the player's lateral road-space position
 *     (playerX), which is in screen-pixels at perspective scale=1 — the same
 *     units used at the very bottom of the road where the car sits.
 */

/** Screen Y of the car's bottom edge (pixels from top of canvas).
 *  Matches the default logical height of 224. */
export const CAR_BOTTOM_Y = 216; // 224 - 8

/** Width and height of the car sprite bounding box in pixels. */
export const CAR_WIDTH = 32;
export const CAR_HEIGHT = 14;

/** Steering state determines which sprite shape to draw. */
export type SteerState = 'straight' | 'left' | 'right';

// ---------------------------------------------------------------------------
// Colour palette (pixel-art F1 car)
// ---------------------------------------------------------------------------

const BODY_RED = '#cc2222';
const BODY_RED_DARK = '#991111';
const BODY_WHITE = '#f0f0f0';
const COCKPIT = '#111122';
const TYRE = '#1a1a1a';
const WING_YELLOW = '#e0c000';

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

/**
 * Fill a pixel-accurate rectangle anchored to a logical grid.
 * All coordinates are relative to (cx, cy) — the horizontal centre and
 * the bottom edge of the car's bounding box.
 */
function px(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(cx + x), Math.round(cy + y), w, h);
}

// ---------------------------------------------------------------------------
// Sprite drawing
// ---------------------------------------------------------------------------

/**
 * Draw the player car with a straight-ahead orientation.
 *
 * Layout (origin = horizontal centre, bottom of sprite):
 *
 *   ·····[WING 14px]·····        y = -14  h=2   front wing
 *   ··[W]·[BODY 20px]·[W]··     y = -12  h=8   body + tyres
 *   ·····[COCKPIT 6px]·····      y = -10  h=4   cockpit opening
 *   ·[REAR WING 26px]·          y = -4   h=2   rear wing
 *   [TYRE 4][——][TYRE 4]         y = -2   h=2   rear tyres
 */
function drawStraight(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Rear tyres (bottom of car)
  px(ctx, cx, cy, -16, -2, 7, 2, TYRE);
  px(ctx, cx, cy, 9, -2, 7, 2, TYRE);

  // Rear wing
  px(ctx, cx, cy, -13, -4, 26, 2, WING_YELLOW);

  // Main body
  px(ctx, cx, cy, -10, -12, 20, 8, BODY_RED);

  // Body shadow (bottom edge darker)
  px(ctx, cx, cy, -10, -5, 20, 1, BODY_RED_DARK);

  // White nose stripe
  px(ctx, cx, cy, -3, -12, 6, 2, BODY_WHITE);

  // Cockpit
  px(ctx, cx, cy, -3, -10, 6, 4, COCKPIT);

  // Side pods
  px(ctx, cx, cy, -14, -10, 4, 5, BODY_RED_DARK);
  px(ctx, cx, cy, 10, -10, 4, 5, BODY_RED_DARK);

  // Front wing
  px(ctx, cx, cy, -7, -14, 14, 2, BODY_WHITE);
}

/**
 * Draw the car angled left (car has steered left — rear shifts slightly right).
 */
function drawLeft(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Shift the whole car 3px right to give the illusion of rotation
  const shift = 3;

  // Rear tyres
  px(ctx, cx, cy, -16 + shift, -2, 7, 2, TYRE);
  px(ctx, cx, cy, 9 + shift, -2, 5, 2, TYRE); // right tyre partly hidden

  // Rear wing (angled — left side taller)
  px(ctx, cx, cy, -13 + shift, -5, 13, 3, WING_YELLOW); // left half
  px(ctx, cx, cy, 0 + shift, -4, 13, 2, WING_YELLOW); // right half

  // Main body (shifted right, left face visible)
  px(ctx, cx, cy, -10 + shift, -12, 20, 8, BODY_RED);
  px(ctx, cx, cy, -11 + shift, -11, 2, 6, BODY_RED_DARK); // left side face

  // White nose stripe (shifted with body)
  px(ctx, cx, cy, -2 + shift, -12, 6, 2, BODY_WHITE);

  // Cockpit (shifted)
  px(ctx, cx, cy, -2 + shift, -10, 6, 4, COCKPIT);

  // Side pods
  px(ctx, cx, cy, -14 + shift, -10, 3, 5, BODY_RED_DARK);
  px(ctx, cx, cy, 10 + shift, -10, 4, 5, BODY_RED_DARK);

  // Front wing
  px(ctx, cx, cy, -6 + shift, -14, 12, 2, BODY_WHITE);
}

/**
 * Draw the car angled right (car has steered right — rear shifts slightly left).
 */
function drawRight(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Shift the whole car 3px left
  const shift = -3;

  // Rear tyres
  px(ctx, cx, cy, -16 + shift, -2, 5, 2, TYRE); // left tyre partly hidden
  px(ctx, cx, cy, 9 + shift, -2, 7, 2, TYRE);

  // Rear wing (angled — right side taller)
  px(ctx, cx, cy, -13 + shift, -4, 13, 2, WING_YELLOW); // left half
  px(ctx, cx, cy, 0 + shift, -5, 13, 3, WING_YELLOW); // right half taller

  // Main body (shifted left, right face visible)
  px(ctx, cx, cy, -10 + shift, -12, 20, 8, BODY_RED);
  px(ctx, cx, cy, 9 + shift, -11, 2, 6, BODY_RED_DARK); // right side face

  // White nose stripe (shifted with body)
  px(ctx, cx, cy, -4 + shift, -12, 6, 2, BODY_WHITE);

  // Cockpit (shifted)
  px(ctx, cx, cy, -4 + shift, -10, 6, 4, COCKPIT);

  // Side pods
  px(ctx, cx, cy, -14 + shift, -10, 4, 5, BODY_RED_DARK);
  px(ctx, cx, cy, 10 + shift, -10, 3, 5, BODY_RED_DARK);

  // Front wing
  px(ctx, cx, cy, -6 + shift, -14, 12, 2, BODY_WHITE);
}

// ---------------------------------------------------------------------------
// Public renderer
// ---------------------------------------------------------------------------

export class PlayerCarRenderer {
  constructor(
    readonly width: number = 256,
    readonly height: number = 224
  ) {}

  /**
   * Render the player car onto the canvas.
   *
   * @param ctx       Canvas 2D rendering context.
   * @param playerX   Lateral road-space position in screen-pixels at scale=1.
   *                  0 = road centre; positive = right of centre.
   * @param steer     Current steering direction (determines sprite).
   */
  render(ctx: CanvasRenderingContext2D, playerX: number, steer: SteerState): void {
    // Centre of car horizontally: screen centre + playerX offset.
    const cx = Math.round(this.width / 2 + playerX);
    // Bottom edge of car at fixed Y near the bottom of the screen.
    const cy = CAR_BOTTOM_Y;

    ctx.save();
    switch (steer) {
      case 'left':
        drawLeft(ctx, cx, cy);
        break;
      case 'right':
        drawRight(ctx, cx, cy);
        break;
      default:
        drawStraight(ctx, cx, cy);
    }
    ctx.restore();
  }

  /**
   * Derive the steering state from the current input keys.
   *
   * When both keys are pressed simultaneously the state is 'straight'.
   */
  static steerState(left: boolean, right: boolean): SteerState {
    if (left && !right) return 'left';
    if (right && !left) return 'right';
    return 'straight';
  }
}
