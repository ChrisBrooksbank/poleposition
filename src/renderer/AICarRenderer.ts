/**
 * AICarRenderer — renders AI opponent cars with distance-based perspective scaling.
 *
 * Uses the same projection pipeline as BillboardRenderer:
 *  1. Compute relative Z from player position (with lap-wrap).
 *  2. Derive perspective scale = cameraDepth / relZ.
 *  3. Look up the per-scanline curve offset so cars stay road-aligned on bends.
 *  4. Z-sort all visible cars farthest-first before drawing so nearer cars
 *     correctly paint over distant ones.
 *
 * Each of the 4 colour palettes gives a car its own livery (body + wing colour).
 */

import { CAMERA_DEPTH, HORIZON_Y, computeCurveOffsets, type CurveFunction } from './RoadRenderer';
import { TRACK_LENGTH } from '../track/fujiSpeedway';
import type { AICarState } from '../ai/AICarSystem';

// ---------------------------------------------------------------------------
// World-space car dimensions (used for perspective scaling)
// ---------------------------------------------------------------------------

/**
 * World-space width of an AI car sprite.
 *
 * Uses the same large-unit scale as billboard dimensions (BILLBOARD_WORLD_WIDTH=400).
 * At relZ=50 m: scale=0.0168 → screenW ≈ 20 px.
 */
export const AI_CAR_WORLD_WIDTH = 1200;

/**
 * World-space height of an AI car sprite.
 *
 * At relZ=50 m: scale=0.0168 → screenH ≈ 12 px.
 * At relZ=140 m: scale=0.006 → screenH ≈ 4 px (minimum detail threshold).
 */
export const AI_CAR_WORLD_HEIGHT = 700;

/**
 * Maximum world-Z distance (metres) at which AI cars are drawn.
 *
 * The perspective formula places objects at the horizon once relZ > ~188 m,
 * so 150 m keeps all AI cars well within the visible road area.
 */
export const AI_CAR_DRAW_DISTANCE = 150;

/** Minimum screen height (pixels) before an AI car is skipped. */
const MIN_SCREEN_HEIGHT = 2;

// ---------------------------------------------------------------------------
// Colour palettes — 4 liveries
// ---------------------------------------------------------------------------

interface CarPalette {
  body: string;
  bodyDark: string;
  wing: string;
  tyre: string;
}

/** Four distinct livery palettes indexed by AICarState.colorVariant (0–3). */
const AI_CAR_PALETTES: readonly CarPalette[] = [
  { body: '#2244cc', bodyDark: '#112288', wing: '#ffffff', tyre: '#1a1a1a' }, // Blue
  { body: '#ccaa22', bodyDark: '#886611', wing: '#cc2222', tyre: '#1a1a1a' }, // Yellow
  { body: '#d8d8d8', bodyDark: '#888888', wing: '#2244cc', tyre: '#1a1a1a' }, // Silver
  { body: '#22aa44', bodyDark: '#116622', wing: '#ccaa22', tyre: '#1a1a1a' }, // Green
] as const;

// ---------------------------------------------------------------------------
// Internal projected-car descriptor
// ---------------------------------------------------------------------------

interface ProjectedAICar {
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  colorVariant: number;
  relativeZ: number;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class AICarRenderer {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly horizonY = HORIZON_Y,
    readonly cameraDepth = CAMERA_DEPTH
  ) {}

  /**
   * Render all visible AI cars to the canvas.
   *
   * @param ctx      Canvas 2D rendering context.
   * @param cars     Current AI car states from AICarSystem.getCars().
   * @param playerZ  Player's absolute world-Z in metres.
   * @param getCurve Curve-strength function (same as passed to RoadRenderer).
   * @param playerX  Player's lateral road-space position in pixels (shifts cars
   *                 so they stay correctly aligned with the road).
   */
  render(
    ctx: CanvasRenderingContext2D,
    cars: readonly AICarState[],
    playerZ: number,
    getCurve?: CurveFunction,
    playerX = 0
  ): void {
    const xOffsets =
      getCurve != null
        ? computeCurveOffsets(this.height, this.horizonY, this.cameraDepth, playerZ, getCurve)
        : new Float32Array(this.height);

    const projected: ProjectedAICar[] = [];

    for (const car of cars) {
      const p = this._projectCar(car, playerZ, xOffsets, playerX);
      if (p !== null) projected.push(p);
    }

    // Farthest first — nearer cars paint over distant ones.
    projected.sort((a, b) => b.relativeZ - a.relativeZ);

    for (const p of projected) {
      this._drawCar(ctx, p);
    }
  }

  /** @internal Project one AI car to screen coordinates.  Returns null if not visible. */
  _projectCar(
    car: AICarState,
    playerZ: number,
    xOffsets: Float32Array,
    playerX: number
  ): ProjectedAICar | null {
    // Relative Z with lap-wrap (same formula as BillboardRenderer._projectOne).
    const rawRel = (((car.z - playerZ) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
    const relZ = rawRel > TRACK_LENGTH / 2 ? rawRel - TRACK_LENGTH : rawRel;

    if (relZ <= 0 || relZ > AI_CAR_DRAW_DISTANCE) return null;

    const maxDepth = this.height - this.horizonY;
    const scale = this.cameraDepth / relZ;
    const baseDepth = scale * maxDepth;
    const baseY = Math.round(this.horizonY + baseDepth);

    if (baseY >= this.height || baseY <= this.horizonY) return null;

    const screenW = Math.max(1, Math.round(AI_CAR_WORLD_WIDTH * scale));
    const screenH = Math.max(1, Math.round(AI_CAR_WORLD_HEIGHT * scale));

    if (screenH < MIN_SCREEN_HEIGHT) return null;

    // Look up curve offset at the scanline where the car base sits.
    const clampedY = Math.max(this.horizonY + 1, Math.min(this.height - 1, baseY));
    const curveOffset = (xOffsets[clampedY] ?? 0) - playerX;

    const centerX = this.width / 2 + curveOffset + car.x * scale;
    const screenX = Math.round(centerX - screenW / 2);
    const screenY = baseY - screenH;

    // Horizontal cull (generous margin so partially-visible cars still draw).
    if (screenX + screenW < -screenW || screenX > this.width + screenW) return null;

    return { screenX, screenY, screenW, screenH, colorVariant: car.colorVariant, relativeZ: relZ };
  }

  /** @internal Draw a single projected AI car sprite. */
  private _drawCar(ctx: CanvasRenderingContext2D, p: ProjectedAICar): void {
    const { screenX, screenY, screenW, screenH, colorVariant } = p;
    const palette = AI_CAR_PALETTES[colorVariant % AI_CAR_PALETTES.length];

    // Main body
    ctx.fillStyle = palette.body;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    if (screenH >= 4 && screenW >= 4) {
      // Rear wing — top strip in contrasting colour
      const wingH = Math.max(1, Math.round(screenH / 5));
      ctx.fillStyle = palette.wing;
      ctx.fillRect(screenX, screenY, screenW, wingH);

      // Dark underside for depth
      const darkH = Math.max(1, Math.round(screenH / 4));
      ctx.fillStyle = palette.bodyDark;
      ctx.fillRect(screenX, screenY + screenH - darkH, screenW, darkH);
    }

    if (screenH >= 6 && screenW >= 6) {
      // Rear tyres — dark blocks at bottom corners
      const tyreW = Math.max(1, Math.round(screenW / 5));
      const tyreH = Math.max(1, Math.round(screenH / 3));
      ctx.fillStyle = palette.tyre;
      ctx.fillRect(screenX, screenY + screenH - tyreH, tyreW, tyreH);
      ctx.fillRect(screenX + screenW - tyreW, screenY + screenH - tyreH, tyreW, tyreH);
    }
  }
}
