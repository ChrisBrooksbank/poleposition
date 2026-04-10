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

/** Checker square colours (black, white) used at the start/finish line. */
export const CHECKER_COLORS: readonly [string, string] = ['#000000', '#ffffff'];

/**
 * Length of the start/finish checker zone in world-z units.
 * Spans 4 visual segments so the checkers are visible as the player approaches.
 */
export const CHECKER_ZONE_LENGTH = SEGMENT_LENGTH * 4;

/**
 * Number of checker columns rendered across the road at the start/finish line.
 * Each column alternates between black and white (rows alternate by depth).
 */
export const CHECKER_COLS = 4;

/** Two road-surface shades (dark, light) that alternate per segment. */
export const ROAD_COLORS: readonly [string, string] = ['#6b6b6b', '#787878'];

/** Rumble-strip colours (red, white) that alternate per segment. */
export const RUMBLE_COLORS: readonly [string, string] = ['#cc2222', '#ffffff'];

/**
 * Returns the lateral curve strength at a given world-Z position.
 *
 * Positive values = curve to the right; negative = curve to the left.
 * The magnitude controls how many screen pixels of horizontal offset are
 * accumulated per unit of world distance at that position.
 */
export type CurveFunction = (worldZ: number) => number;

/**
 * Compute per-scanline horizontal screen-space offsets that implement a
 * curved road appearance.
 *
 * Accumulates from the bottom of the road area (near) upward toward the
 * horizon (far).  Each scanline contributes `getCurve(worldZ) × ΔworldZ`
 * to a running total, so farther strips receive a larger offset.  In
 * perspective this makes the road appear to sweep sideways in the distance —
 * the classic pseudo-3D curve effect.  The topmost visible strip carries the
 * maximum accumulated offset, causing the vanishing point to sway
 * side-to-side on curved sections.
 *
 * @param height      Canvas height in pixels.
 * @param horizonY    Screen Y of the horizon line.
 * @param cameraDepth Camera depth constant (same value used in projection).
 * @param playerZ     Player's current world-Z position added to the scanline
 *                    worldZ when sampling getCurve, so the correct track
 *                    segment is looked up as the player drives forward.
 * @param getCurve    Curve-strength function (see {@link CurveFunction}).
 * @returns           Float32Array of length `height` indexed by screen Y.
 *                    Entries for y ≤ horizonY are always 0.
 */
export function computeCurveOffsets(
  height: number,
  horizonY: number,
  cameraDepth: number,
  playerZ: number,
  getCurve: CurveFunction
): Float32Array {
  const offsets = new Float32Array(height);
  const maxDepth = height - horizonY;
  let dx = 0;

  // Iterate from near (bottom) to far (toward horizon).
  // As y decreases, worldZ increases (strips are farther from the player).
  for (let y = height - 1; y > horizonY; y--) {
    const depth = y - horizonY;
    const worldZ = (cameraDepth * maxDepth) / depth;

    // World-Z of the next (farther) scanline one pixel up.
    const nextDepth = depth - 1; // (y - 1) - horizonY
    const nextWorldZ = nextDepth > 0 ? (cameraDepth * maxDepth) / nextDepth : worldZ * 2;

    // Accumulate: curve strength × worldZ × ΔworldZ.
    //
    // For a road with constant curvature c, the lateral world-space position
    // of the road centre at depth Z is c·Z²/2 (the integral of c·z dz).
    // Feeding this world-space value through projectScanline's `cameraX * scale`
    // (where scale = cameraDepth / Z) yields a screen offset of c·Z·cameraDepth/2
    // which grows linearly with Z — correctly placing the vanishing point further
    // to one side the deeper into a curve the player has travelled.
    const deltaZ = nextWorldZ - worldZ;
    dx += getCurve(worldZ + playerZ) * worldZ * deltaZ;
    offsets[y] = dx;
  }

  return offsets;
}

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

/**
 * Returns true when a world-Z position falls within the start/finish checker
 * zone at the lap boundary.
 *
 * The checker zone starts at worldZ = 0 (mod lapLength) and extends for
 * {@link CHECKER_ZONE_LENGTH} world units.  The caller should supply a
 * positive `lapLength`; passing 0 or negative always returns false.
 *
 * @param worldZ    Absolute world Z (playerZ + scanline z).
 * @param lapLength Total lap length in world-z units.
 */
export function isInCheckerZone(worldZ: number, lapLength: number): boolean {
  if (lapLength <= 0) return false;
  const pos = ((worldZ % lapLength) + lapLength) % lapLength;
  return pos < CHECKER_ZONE_LENGTH;
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
   * When `getCurve` is supplied, the road curves are rendered by accumulating
   * a per-scanline horizontal screen-space offset (see {@link computeCurveOffsets}).
   * Far strips receive a larger offset than near strips, so the vanishing point
   * sways side-to-side on curved sections.
   *
   * @param ctx       Canvas 2D rendering context.
   * @param playerZ   Player's absolute world-Z position (normalised world units).
   *                  Scrolls the segment colour pattern and curve lookup as the
   *                  car moves forward.
   * @param getCurve  Optional curve-strength function.  When omitted the road
   *                  is rendered as a straight.
   * @param lapLength Total lap length in world-z units.  When > 0 the start/finish
   *                  checkered pattern is drawn at the lap boundary (worldZ = 0 mod
   *                  lapLength).  Defaults to 0 (no checker rendered).
   * @param playerX   Player's lateral position in screen-pixels at perspective
   *                  scale=1.  0 = road centre; positive = right of centre.
   *                  Shifts the rendered road left/right so the car's position
   *                  is reflected visually.  Defaults to 0.
   */
  render(
    ctx: CanvasRenderingContext2D,
    playerZ = 0,
    getCurve?: CurveFunction,
    lapLength = 0,
    playerX = 0
  ): void {
    const maxDepth = this.height - this.horizonY;

    // Pre-compute per-scanline curve offsets (all zeros when road is straight).
    const xOffsets: Float32Array =
      getCurve != null
        ? computeCurveOffsets(this.height, this.horizonY, this.cameraDepth, playerZ, getCurve)
        : new Float32Array(this.height);

    for (let y = this.horizonY + 1; y < this.height; y++) {
      // Subtract playerX so when the car moves right the road shifts left.
      const { roadLeft, roadRight, scale } = this.projectScanline(y, xOffsets[y] - playerX);

      // World-space z for this scanline.
      const depth = y - this.horizonY;
      const z = (this.cameraDepth * maxDepth) / depth;

      // Segment palette index — shared by road, grass, and rumble.
      const seg = segmentIndex(z + playerZ);

      const grassColor = GRASS_COLORS[seg];
      const roadColor = ROAD_COLORS[seg];
      const rumbleColor = RUMBLE_COLORS[seg];

      // Start/finish checker zone detection.
      // When lapLength > 0, determine whether this scanline falls within the
      // checker zone and which row (0 or 1) it belongs to.  Row alternates
      // half-way through the zone so the checker reads as a 2D grid of squares.
      const lapPos = lapLength > 0 ? (((z + playerZ) % lapLength) + lapLength) % lapLength : -1;
      const inChecker = lapPos >= 0 && lapPos < CHECKER_ZONE_LENGTH;
      const checkerRow = inChecker ? Math.floor((lapPos / CHECKER_ZONE_LENGTH) * 2) % 2 : 0;

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
          if (inChecker) {
            // Start/finish line: render alternating black/white checker columns.
            // Columns and rows together form a 2D grid of squares.
            const roadPxWidth = midRight - midLeft;
            const colWidth = roadPxWidth / CHECKER_COLS;
            for (let col = 0; col < CHECKER_COLS; col++) {
              const cx = midLeft + col * colWidth;
              const cx2 = midLeft + (col + 1) * colWidth;
              const px = Math.round(cx);
              const pw = Math.max(1, Math.round(cx2) - px);
              const isBlack = (col + checkerRow) % 2 === 0;
              ctx.fillStyle = CHECKER_COLORS[isBlack ? 0 : 1];
              ctx.fillRect(px, y, pw, 1);
            }
          } else {
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
