/**
 * BackgroundRenderer - Sky, mountain range and Mt. Fuji background layer.
 *
 * Renders the scene above the road horizon using the HTML5 Canvas 2D API.
 * Supports horizontal parallax scrolling synced to the road curve system:
 * a positive parallaxX offset shifts the background rightward (the road is
 * curving right), and a negative offset shifts it leftward.
 *
 * Layers, front-to-back:
 *   1. Sky gradient   – no parallax (infinite depth)
 *   2. Mt. Fuji       – slow parallax (very distant landmark)
 *   3. Mountain range – faster parallax (closer ridge line)
 */

/** Screen Y of the horizon line. Must match RoadRenderer.HORIZON_Y. */
export const BG_HORIZON_Y = 112;

/** Sky colour at the top of the screen. */
export const SKY_TOP_COLOR = '#1a3d78';

/** Sky colour at the horizon. */
export const SKY_HORIZON_COLOR = '#7ab8e8';

/** Mountain range fill colour. */
export const MOUNTAIN_COLOR = '#3a5a78';

/** Mt. Fuji body fill colour. */
export const FUJI_COLOR = '#4a6880';

/** Mt. Fuji snow cap colour. */
export const FUJI_SNOW_COLOR = '#e0e8f0';

/**
 * Parallax scale applied to the raw curve offset for the mountain range.
 * The range is "closer" so it moves more than Fuji.
 */
export const PARALLAX_MOUNTAIN = 0.3;

/**
 * Parallax scale applied to the raw curve offset for Mt. Fuji.
 * Fuji is very distant so it moves very slowly.
 */
export const PARALLAX_FUJI = 0.12;

/**
 * Mt. Fuji peak position as a fraction of the canvas width [0..1].
 * Placed slightly right of centre, matching the track's approach angle.
 */
export const FUJI_CENTER_X_FRAC = 0.7;

/**
 * Mountain ridge definition as a sequence of [xFrac, y] pairs, where
 * xFrac ∈ [0, 1] maps to one full canvas width and y is the pixel row
 * from the top of the screen.  Designed to tile seamlessly (first and last
 * points share the same y so a shifted copy joints without a step).
 */
export const MOUNTAIN_RIDGE: readonly [number, number][] = [
  [0.0, 96],
  [0.05, 88],
  [0.1, 80],
  [0.15, 90],
  [0.2, 74],
  [0.25, 84],
  [0.3, 78],
  [0.36, 92],
  [0.42, 68],
  [0.47, 80],
  [0.53, 86],
  [0.58, 72],
  [0.63, 82],
  [0.68, 76],
  [0.74, 88],
  [0.8, 70],
  [0.86, 84],
  [0.91, 78],
  [0.96, 90],
  [1.0, 96],
];

/**
 * Background scene renderer.
 *
 * Call {@link render} once per frame before the road is drawn.  The
 * `parallaxX` argument should be derived from the road curve accumulation at
 * the vanishing point (e.g. the value of `curveOffsets[horizonY + 1]`).
 */
export class BackgroundRenderer {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly horizonY = BG_HORIZON_Y
  ) {}

  /**
   * Draw the background layer to the canvas.
   *
   * @param ctx        Canvas 2D rendering context.
   * @param parallaxX  Raw horizontal pixel offset driving parallax.
   *                   Positive = scene shifts right (right-hand curve ahead).
   *                   Typically `curveOffsets[horizonY + 1]` from RoadRenderer.
   */
  render(ctx: CanvasRenderingContext2D, parallaxX = 0): void {
    this._drawSky(ctx);
    this._drawFuji(ctx, parallaxX * PARALLAX_FUJI);
    this._drawMountains(ctx, parallaxX * PARALLAX_MOUNTAIN);
  }

  /** Draw the sky gradient filling the area from y=0 to the horizon. */
  private _drawSky(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    gradient.addColorStop(0, SKY_TOP_COLOR);
    gradient.addColorStop(1, SKY_HORIZON_COLOR);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.horizonY);
  }

  /**
   * Draw Mt. Fuji as a symmetrical volcanic cone with snow cap.
   *
   * The cone is centred near the right side of the screen and tiles at the
   * canvas edges if the parallax offset pushes it off screen.
   *
   * @param ctx     Canvas 2D context.
   * @param shiftX  Pre-scaled parallax offset in pixels.
   */
  private _drawFuji(ctx: CanvasRenderingContext2D, shiftX: number): void {
    const cx = Math.round(this.width * FUJI_CENTER_X_FRAC + shiftX);
    const peakY = 30;
    const halfBase = 70;
    const snowHalfBase = 22;
    const snowBottom = peakY + 20;

    // Body
    ctx.fillStyle = FUJI_COLOR;
    ctx.beginPath();
    ctx.moveTo(cx - halfBase, this.horizonY);
    ctx.lineTo(cx, peakY);
    ctx.lineTo(cx + halfBase, this.horizonY);
    ctx.closePath();
    ctx.fill();

    // Snow cap
    ctx.fillStyle = FUJI_SNOW_COLOR;
    ctx.beginPath();
    ctx.moveTo(cx - snowHalfBase, snowBottom);
    ctx.lineTo(cx, peakY);
    ctx.lineTo(cx + snowHalfBase, snowBottom);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw the mountain range silhouette as a filled path.
   *
   * The ridge tiles seamlessly: the same path is drawn shifted by ±width so
   * the scene fills the canvas completely regardless of the parallax offset.
   *
   * @param ctx     Canvas 2D context.
   * @param shiftX  Pre-scaled parallax offset in pixels.
   */
  private _drawMountains(ctx: CanvasRenderingContext2D, shiftX: number): void {
    // Wrap shiftX into [-width, 0] so one extra tile always covers the gap.
    const wrap = ((shiftX % this.width) + this.width) % this.width;
    // Draw two copies: one starting at wrap, one at wrap - width.
    // Together they cover the full canvas width without gaps.
    for (const tileOffsetX of [wrap, wrap - this.width]) {
      this._drawRidge(ctx, tileOffsetX);
    }
  }

  /**
   * Draw one tile of the mountain ridge starting at `tileOffsetX`.
   *
   * @param ctx         Canvas 2D context.
   * @param tileOffsetX Pixel offset from screen left for this tile copy.
   */
  private _drawRidge(ctx: CanvasRenderingContext2D, tileOffsetX: number): void {
    ctx.fillStyle = MOUNTAIN_COLOR;
    ctx.beginPath();
    ctx.moveTo(tileOffsetX, this.horizonY);

    for (const [xFrac, y] of MOUNTAIN_RIDGE) {
      ctx.lineTo(tileOffsetX + xFrac * this.width, y);
    }

    ctx.lineTo(tileOffsetX + this.width, this.horizonY);
    ctx.closePath();
    ctx.fill();
  }
}
