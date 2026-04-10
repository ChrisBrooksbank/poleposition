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

/**
 * Normalised world-z distance per colour segment.
 * Each segment alternates the road/grass/rumble palette entry.
 * Visually this creates the depth-cue stripe pattern seen in the original game.
 */
export const SEGMENT_LENGTH = 0.35;

/**
 * Rumble-strip width in pixels at full perspective scale (scale = 1).
 * Scales down toward the horizon proportionally to the perspective factor.
 */
export const RUMBLE_WIDTH = 8;

/** Two grass shades (dark, light) that alternate per segment. */
export const GRASS_COLORS: readonly [string, string] = ['#4a7c1e', '#5a8e28'];

/** Two road-surface shades (dark, light) that alternate per segment. */
export const ROAD_COLORS: readonly [string, string] = ['#6b6b6b', '#787878'];

/** Rumble-strip colours (red, white) that alternate per segment. */
export const RUMBLE_COLORS: readonly [string, string] = ['#cc2222', '#ffffff'];

/**
 * Return which of the two palette entries (0 or 1) applies to a given
 * world-space Z position.
 *
 * @param worldZ        Absolute world Z (player position + scanline z).
 *                      Pass Infinity (or any non-finite value) for the far
 *                      horizon; the function safely returns 0 in that case.
 * @param segmentLength Length of each colour segment in world-z units.
 */
export function segmentIndex(worldZ: number, segmentLength = SEGMENT_LENGTH): 0 | 1 {
  if (!isFinite(worldZ)) return 0;
  // Ensure positive before modulo to handle negative playerZ values gracefully.
  const idx = Math.floor(Math.abs(worldZ) / segmentLength) % 2;
  return idx as 0 | 1;
}

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
   * projecting each strip and filling: grass (left), rumble strip (left edge),
   * road surface (centre), centre-line dash, rumble strip (right edge),
   * grass (right).
   *
   * Road surface and grass alternate between two shades per world segment to
   * create the classic depth-cue stripe pattern.  Rumble strips alternate
   * between red and white on the same segment boundaries.
   *
   * @param ctx      Canvas 2D rendering context.
   * @param cameraX  Lateral camera offset (see projectScanline).
   * @param playerZ  Player's absolute world-Z position (normalised world units).
   *                 Scrolls the segment colour pattern as the car moves forward.
   */
  render(ctx: CanvasRenderingContext2D, cameraX = 0, playerZ = 0): void {
    const maxDepth = this.height - this.horizonY;

    for (let y = this.horizonY + 1; y < this.height; y++) {
      const { roadLeft, roadRight, scale } = this.projectScanline(y, cameraX);

      // World-space z for this scanline.
      const depth = y - this.horizonY;
      const z = (this.cameraDepth * maxDepth) / depth;

      // Segment palette index — shared by road, grass, and rumble.
      const seg = segmentIndex(z + playerZ);

      const grassColor = GRASS_COLORS[seg];
      const roadColor = ROAD_COLORS[seg];
      const rumbleColor = RUMBLE_COLORS[seg];

      const left = Math.max(0, Math.round(roadLeft));
      const right = Math.min(this.width, Math.round(roadRight));
      const roadWidth = right - left;

      // Grass — left of road
      if (left > 0) {
        ctx.fillStyle = grassColor;
        ctx.fillRect(0, y, left, 1);
      }

      if (roadWidth > 0) {
        // Rumble-strip width: at least 1 px; at most ⅓ of road width each side.
        const rumble = Math.max(
          1,
          Math.min(Math.round(RUMBLE_WIDTH * scale), Math.floor(roadWidth / 3))
        );

        // Left rumble strip
        ctx.fillStyle = rumbleColor;
        ctx.fillRect(left, y, rumble, 1);

        const midLeft = left + rumble;
        const midRight = right - rumble;

        if (midRight > midLeft) {
          // Road surface
          ctx.fillStyle = roadColor;
          ctx.fillRect(midLeft, y, midRight - midLeft, 1);

          // Centre-line dash: drawn only on even-index segments to create gaps.
          if (seg === 0 && midRight - midLeft > 2) {
            const centerX = Math.round((midLeft + midRight) / 2);
            const dashHalf = Math.max(1, Math.round(scale * 3));
            const dl = Math.max(midLeft, centerX - dashHalf);
            const dr = Math.min(midRight, centerX + dashHalf);
            if (dr > dl) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(dl, y, dr - dl, 1);
            }
          }
        }

        // Right rumble strip (only if there is space for it separately from left)
        if (right - rumble > left + rumble) {
          ctx.fillStyle = rumbleColor;
          ctx.fillRect(right - rumble, y, rumble, 1);
        }
      }

      // Grass — right of road
      if (right < this.width) {
        ctx.fillStyle = grassColor;
        ctx.fillRect(right, y, this.width - right, 1);
      }
    }
  }
}
