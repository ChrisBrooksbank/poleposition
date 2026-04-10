/**
 * RoadRenderer - Pseudo-3D scanline road renderer
 *
 * Renders the road as horizontal strips using perspective projection:
 *   screen_scale = cameraDepth / z_distance
 *
 * The road occupies the bottom half of the screen (below the horizon line).
 * Each horizontal strip (one pixel tall) represents a slice of road at a
 * particular world-space depth.  Strips near the horizon are very narrow
 * (far away), while strips at the bottom of the screen are wide (close).
 */

/** Screen Y of the horizon (road starts below this line). */
export const HORIZON_Y = 112;

/**
 * Normalised camera depth constant used in the projection formula.
 * Controls how aggressively the road narrows toward the horizon.
 */
export const CAMERA_DEPTH = 0.84;

/**
 * Road half-width at the maximum scale (bottom of screen), in screen pixels.
 * At the closest visible distance the road spans 2 × ROAD_HALF_WIDTH pixels.
 */
export const ROAD_HALF_WIDTH = 110;

/** Data for a single projected horizontal strip. */
export interface ProjectedStrip {
  /** Screen Y coordinate of this strip. */
  screenY: number;
  /**
   * Perspective scale factor computed as:
   *   scale = cameraDepth / z_distance
   * Equals 0 at the horizon (infinite distance) and approaches 1 at the
   * bottom of the road area (closest visible distance).
   */
  scale: number;
  /** Screen X of the left edge of the road on this strip. */
  roadLeft: number;
  /** Screen X of the right edge of the road on this strip. */
  roadRight: number;
}

/**
 * Pseudo-3D scanline renderer.
 *
 * Projects road geometry onto the screen using per-scanline perspective
 * projection.  Only the basic road shape is rendered here (gray road on
 * green grass).  Surface markings, curves, and other details are added by
 * later tasks that extend or wrap this renderer.
 */
export class RoadRenderer {
  readonly horizonY: number;
  readonly cameraDepth: number;
  readonly roadHalfWidth: number;

  constructor(
    readonly width: number,
    readonly height: number,
    horizonY = HORIZON_Y,
    cameraDepth = CAMERA_DEPTH,
    roadHalfWidth = ROAD_HALF_WIDTH
  ) {
    this.horizonY = horizonY;
    this.cameraDepth = cameraDepth;
    this.roadHalfWidth = roadHalfWidth;
  }

  /**
   * Project a single scanline to screen coordinates using perspective.
   *
   * The z_distance for a scanline is derived from its position below the
   * horizon:
   *
   *   z_distance = cameraDepth * maxDepth / depth
   *
   * where depth = screenY - horizonY and maxDepth = height - horizonY.
   *
   * The scale then follows directly from the core projection formula:
   *
   *   screen_scale = cameraDepth / z_distance = depth / maxDepth
   *
   * @param screenY  Screen Y coordinate of the strip (must be > horizonY for
   *                 a visible road pixel; at exactly horizonY scale is 0).
   * @param cameraX  Lateral camera offset in world units.  Positive values
   *                 shift the visible road centre to the right on screen
   *                 (used to create the appearance of road curves).
   */
  projectScanline(screenY: number, cameraX = 0): ProjectedStrip {
    const depth = screenY - this.horizonY; // pixels below the horizon
    const maxDepth = this.height - this.horizonY; // road area height in px

    // Z distance in normalised world units (cameraDepth at bottom, ∞ at horizon)
    const z = depth > 0 ? (this.cameraDepth * maxDepth) / depth : Infinity;

    // Perspective scale: screen_scale = cameraDepth / z_distance
    const scale = depth > 0 ? this.cameraDepth / z : 0;
    // Simplifies to: scale = depth / maxDepth

    // Road centre on screen.  cameraX shifts the centre proportionally to
    // the scale (so the effect diminishes toward the horizon, matching how
    // curves work in a perspective view).
    const centerX = this.width / 2 + cameraX * scale;

    return {
      screenY,
      scale,
      roadLeft: centerX - this.roadHalfWidth * scale,
      roadRight: centerX + this.roadHalfWidth * scale,
    };
  }

  /**
   * Render the road to the canvas.
   *
   * Iterates every scanline from the horizon to the bottom of the screen,
   * projecting each strip and filling three regions: grass (left), road
   * surface (centre), grass (right).
   *
   * @param ctx      Canvas 2D rendering context.
   * @param cameraX  Lateral camera offset (see projectScanline).
   */
  render(ctx: CanvasRenderingContext2D, cameraX = 0): void {
    for (let y = this.horizonY + 1; y < this.height; y++) {
      const { roadLeft, roadRight } = this.projectScanline(y, cameraX);

      const left = Math.max(0, Math.round(roadLeft));
      const right = Math.min(this.width, Math.round(roadRight));

      // Grass — left shoulder
      if (left > 0) {
        ctx.fillStyle = '#4a7c1e';
        ctx.fillRect(0, y, left, 1);
      }

      // Road surface
      if (right > left) {
        ctx.fillStyle = '#6b6b6b';
        ctx.fillRect(left, y, right - left, 1);
      }

      // Grass — right shoulder
      if (right < this.width) {
        ctx.fillStyle = '#4a7c1e';
        ctx.fillRect(right, y, this.width - right, 1);
      }
    }
  }
}
