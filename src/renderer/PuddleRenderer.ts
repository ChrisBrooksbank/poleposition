/**
 * PuddleRenderer — renders distance-scaled puddle sprites on the road surface.
 *
 * Puddles lie flat on the road (XZ plane in world space), so they appear as
 * thin horizontal ellipses on screen.  Perspective projection is applied the
 * same way as billboards:
 *   scale = CAMERA_DEPTH / relZ
 *
 * The puddle's screen position and size are determined by:
 *   - Centre screen Y from the scanline corresponding to the puddle's world-Z.
 *   - Screen width = PUDDLE_WORLD_HALF_WIDTH * 2 * scale
 *   - Screen height = difference in Y between the puddle's front and back edges,
 *     producing the correct perspective squash for a flat on-road object.
 *   - Screen X = road centre + curve offset + lateralOffset * scale
 */

import {
  CAMERA_DEPTH,
  HORIZON_Y,
  ROAD_HALF_WIDTH,
  computeCurveOffsets,
  type CurveFunction,
} from './RoadRenderer';
import {
  PUDDLES,
  PUDDLE_WORLD_HALF_WIDTH,
  PUDDLE_WORLD_HALF_DEPTH,
  type Puddle,
} from '../track/puddles';
import { TRACK_LENGTH } from '../track/fujiSpeedway';

/** Maximum world-Z distance at which puddles are drawn (metres). */
export const PUDDLE_DRAW_DISTANCE = 400;

/** Minimum screen height of a puddle in pixels (skip below this). */
const MIN_SCREEN_HEIGHT = 1;

/** Puddle fill colour (blue-grey translucent water). */
const PUDDLE_FILL = '#7ab8d4';

/** Puddle highlight colour (lighter strip to suggest reflectivity). */
const PUDDLE_HIGHLIGHT = '#c0e4f4';

/** Screen-space description of a projected puddle ready to render. */
interface ProjectedPuddle {
  /** Screen X of the left edge. */
  screenX: number;
  /** Screen Y of the top edge (back edge of puddle, farther from player). */
  screenY: number;
  /** Screen width in pixels. */
  screenW: number;
  /** Screen height in pixels. */
  screenH: number;
  /** Relative world-Z distance from player (used for Z-sorting). */
  relativeZ: number;
}

export class PuddleRenderer {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly horizonY = HORIZON_Y,
    readonly cameraDepth = CAMERA_DEPTH,
    readonly roadHalfWidth = ROAD_HALF_WIDTH
  ) {}

  /**
   * Project a single puddle to screen coordinates.
   *
   * Returns null when behind the player, beyond draw distance, or too small.
   */
  private _project(
    puddle: Puddle,
    playerZ: number,
    xOffsets: Float32Array,
    playerX: number
  ): ProjectedPuddle | null {
    // Signed relative Z (positive = ahead of player).
    const rawRel = (((puddle.trackZ - playerZ) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
    const relZ = rawRel > TRACK_LENGTH / 2 ? rawRel - TRACK_LENGTH : rawRel;

    if (relZ <= 0 || relZ > PUDDLE_DRAW_DISTANCE) return null;

    const maxDepth = this.height - this.horizonY;

    // Centre of puddle (in world-Z)
    const scaleCentre = this.cameraDepth / relZ;
    const depthCentre = scaleCentre * maxDepth;
    const baseY = Math.round(this.horizonY + depthCentre);

    if (baseY >= this.height) return null;
    if (baseY <= this.horizonY) return null;

    // Front edge (closer to player: relZ - half-depth) for bottom of ellipse on screen
    const relZFront = relZ - PUDDLE_WORLD_HALF_DEPTH;
    // Back edge (farther: relZ + half-depth) for top of ellipse on screen
    const relZBack = relZ + PUDDLE_WORLD_HALF_DEPTH;

    const scaleFront = relZFront > 0 ? this.cameraDepth / relZFront : 2;
    const scaleBack = relZBack > 0 ? this.cameraDepth / relZBack : scaleCentre;

    const screenYBottom = Math.round(this.horizonY + scaleFront * maxDepth);
    const screenYTop = Math.round(this.horizonY + scaleBack * maxDepth);
    const screenH = Math.max(MIN_SCREEN_HEIGHT, screenYBottom - screenYTop);

    if (screenH < MIN_SCREEN_HEIGHT) return null;

    // Width at centre scale
    const screenW = Math.max(1, Math.round(PUDDLE_WORLD_HALF_WIDTH * 2 * scaleCentre));

    // Horizontal position: road centre + curve offset - playerX lateral shift
    const clampedY = Math.max(this.horizonY + 1, Math.min(this.height - 1, baseY));
    const curveOffset = (xOffsets[clampedY] ?? 0) - playerX;
    const centerX = this.width / 2 + curveOffset + puddle.lateralOffset * scaleCentre;
    const screenX = Math.round(centerX - screenW / 2);

    // Cull if completely off-screen
    if (screenX + screenW < 0 || screenX > this.width) return null;

    return { screenX, screenY: screenYTop, screenW, screenH, relativeZ: relZ };
  }

  /**
   * Render all visible puddles to the canvas.
   *
   * @param ctx      Canvas 2D rendering context.
   * @param playerZ  Player's absolute world-Z in metres.
   * @param getCurve Optional curve-strength function.
   * @param playerX  Player's lateral position in road-space pixels.
   */
  render(
    ctx: CanvasRenderingContext2D,
    playerZ: number,
    getCurve?: CurveFunction,
    playerX = 0
  ): void {
    const xOffsets =
      getCurve != null
        ? computeCurveOffsets(this.height, this.horizonY, this.cameraDepth, playerZ, getCurve)
        : new Float32Array(this.height);

    const projected: ProjectedPuddle[] = [];

    for (const puddle of PUDDLES) {
      const p = this._project(puddle, playerZ, xOffsets, playerX);
      if (p) projected.push(p);
    }

    // Sort farthest-first so nearer puddles render on top.
    projected.sort((a, b) => b.relativeZ - a.relativeZ);

    for (const p of projected) {
      this._draw(ctx, p);
    }
  }

  /** @internal Draw a single projected puddle ellipse. */
  private _draw(ctx: CanvasRenderingContext2D, p: ProjectedPuddle): void {
    const { screenX, screenY, screenW, screenH } = p;

    ctx.save();

    // Main puddle body
    ctx.fillStyle = PUDDLE_FILL;
    ctx.globalAlpha = 0.75;

    if (screenH <= 2 || screenW <= 2) {
      // Too small for an ellipse — just draw a filled rect
      ctx.fillRect(screenX, screenY, screenW, screenH);
    } else {
      // Draw ellipse using bezier approximation via ctx.ellipse
      const cx = screenX + screenW / 2;
      const cy = screenY + screenH / 2;
      const rx = screenW / 2;
      const ry = screenH / 2;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Small highlight arc in upper portion for water sheen
      if (screenW >= 6 && screenH >= 3) {
        ctx.fillStyle = PUDDLE_HIGHLIGHT;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.1, cy - ry * 0.2, rx * 0.5, ry * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
