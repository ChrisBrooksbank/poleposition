/**
 * BillboardRenderer — renders distance-scaled roadside billboard sprites.
 *
 * Billboards are defined in world-space (track position Z, lateral offset X).
 * For each visible billboard:
 *  1. Compute the scanline Y at which the base of the billboard sits by
 *     projecting its world-Z through the same perspective formula as the road.
 *  2. Scale width and height proportionally to the perspective scale at that Y.
 *  3. Lateral position is computed using the same curve-offset accumulation so
 *     billboards stay glued to the road edge even on curved sections.
 *  4. Draw the billboard panel with a simple pixel-art style (coloured rectangle
 *     + label text).
 *
 * Billboards behind the player (negative relative Z) or beyond the draw
 * distance are skipped.
 */

import {
  CAMERA_DEPTH,
  HORIZON_Y,
  ROAD_HALF_WIDTH,
  computeCurveOffsets,
  type CurveFunction,
} from './RoadRenderer';
import {
  BILLBOARDS,
  BILLBOARD_WORLD_WIDTH,
  BILLBOARD_WORLD_HEIGHT,
  BILLBOARD_PALETTE,
  type Billboard,
  type BillboardDesign,
} from '../track/billboards';
import { TRACK_LENGTH } from '../track/fujiSpeedway';

/** Maximum world-Z distance at which billboards are drawn (metres). */
export const BILLBOARD_DRAW_DISTANCE = 800;

/** Label text shown on each billboard design. */
const BILLBOARD_LABELS: Record<BillboardDesign, string> = {
  TURBO: 'TURBO',
  ZOOM_COLA: 'ZOOM COLA',
  OPTIC: 'OPTIC',
  VICTOR: 'VICTOR',
  VELOCE: 'VELOCE',
  FUEL_PLUS: 'FUEL+',
  SPARK: 'SPARK',
};

/** Minimum screen height in pixels for a billboard to be drawn at all. */
const MIN_SCREEN_HEIGHT = 2;

/** Screen-space description of a projected billboard ready to render. */
interface ProjectedBillboard {
  /** Screen X of the left edge. */
  screenX: number;
  /** Screen Y of the top edge. */
  screenY: number;
  /** Screen width in pixels. */
  screenW: number;
  /** Screen height in pixels. */
  screenH: number;
  /** Design index for palette/label lookup. */
  design: BillboardDesign;
  /** Relative world-Z distance from player (used for Z-sorting). */
  relativeZ: number;
}

export class BillboardRenderer {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly horizonY = HORIZON_Y,
    readonly cameraDepth = CAMERA_DEPTH,
    readonly roadHalfWidth = ROAD_HALF_WIDTH
  ) {}

  /**
   * Project a single billboard to screen coordinates.
   *
   * Returns null when the billboard is behind the player, at/beyond the
   * horizon, or too small to see.
   *
   * @param relZ      Relative world-Z distance from player (positive = ahead).
   * @param lateral   Billboard centre lateral offset in world units (road-space X).
   * @param curveOffsetAtBase  Accumulated curve offset (screen pixels) at the
   *                           scanline where the billboard base sits.
   */
  private projectBillboard(
    relZ: number,
    lateral: number,
    curveOffsetAtBase: number,
    design: BillboardDesign
  ): ProjectedBillboard | null {
    if (relZ <= 0) return null;

    const maxDepth = this.height - this.horizonY;

    // Perspective scale at this Z distance.
    const scale = this.cameraDepth / relZ;

    // Screen Y of the billboard base (bottom edge).
    // depth = scale * maxDepth → screenY = horizonY + depth
    const baseDepth = scale * maxDepth;
    const baseY = Math.round(this.horizonY + baseDepth);

    if (baseY >= this.height) return null; // below visible area (too close)
    if (baseY <= this.horizonY) return null; // at or above horizon (too far)

    // Screen dimensions
    const screenW = Math.max(1, Math.round(BILLBOARD_WORLD_WIDTH * scale));
    const screenH = Math.max(1, Math.round(BILLBOARD_WORLD_HEIGHT * scale));

    if (screenH < MIN_SCREEN_HEIGHT) return null;

    // Screen X: road centre + lateral offset scaled by perspective + curve offset
    const centerX = this.width / 2 + curveOffsetAtBase + lateral * scale;
    const screenX = Math.round(centerX - screenW / 2);

    // Billboard top Y
    const screenY = baseY - screenH;

    // Cull if completely off-screen horizontally (with some margin)
    if (screenX + screenW < -screenW || screenX > this.width + screenW) return null;

    return { screenX, screenY, screenW, screenH, design, relativeZ: relZ };
  }

  /**
   * Render all visible billboards to the canvas.
   *
   * Billboards are collected, Z-sorted (farthest first so nearer ones paint on
   * top), then drawn.
   *
   * @param ctx       Canvas 2D rendering context.
   * @param playerZ   Player's absolute world-Z position in metres.
   * @param getCurve  Curve-strength function (same as passed to RoadRenderer).
   */
  render(ctx: CanvasRenderingContext2D, playerZ: number, getCurve?: CurveFunction): void {
    // Pre-compute per-scanline curve offsets (needed to position billboards
    // on the correct horizontal position even on curved sections).
    const xOffsets =
      getCurve != null
        ? computeCurveOffsets(this.height, this.horizonY, this.cameraDepth, playerZ, getCurve)
        : new Float32Array(this.height);

    const projected: ProjectedBillboard[] = [];

    for (const bb of BILLBOARDS) {
      this._projectOne(bb, playerZ, xOffsets, projected);
    }

    // Sort farthest-first so nearer billboards render on top.
    projected.sort((a, b) => b.relativeZ - a.relativeZ);

    for (const p of projected) {
      this._drawBillboard(ctx, p);
    }
  }

  /** @internal Project one billboard, pushing to `out` if visible. */
  private _projectOne(
    bb: Billboard,
    playerZ: number,
    xOffsets: Float32Array,
    out: ProjectedBillboard[]
  ): void {
    // Compute relative Z, wrapping the lap so the billboard appears every lap.
    // We look one lap ahead to handle the transition around the lap boundary.
    const rawRel = (((bb.trackZ - playerZ) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;

    // Prefer the nearest instance: if it's more than half a lap away the
    // "previous" lap's copy is closer.
    const relZ = rawRel > TRACK_LENGTH / 2 ? rawRel - TRACK_LENGTH : rawRel;

    if (relZ <= 0 || relZ > BILLBOARD_DRAW_DISTANCE) return;

    const maxDepth = this.height - this.horizonY;
    const scale = this.cameraDepth / relZ;
    const baseDepth = scale * maxDepth;
    const baseY = Math.round(this.horizonY + baseDepth);

    // Look up the curve offset at the scanline where the billboard base sits.
    const clampedY = Math.max(this.horizonY + 1, Math.min(this.height - 1, baseY));
    const curveOffset = xOffsets[clampedY] ?? 0;

    const p = this.projectBillboard(relZ, bb.lateralOffset, curveOffset, bb.design);
    if (p) out.push(p);
  }

  /** @internal Draw a single projected billboard to the canvas. */
  private _drawBillboard(ctx: CanvasRenderingContext2D, p: ProjectedBillboard): void {
    const { screenX, screenY, screenW, screenH, design } = p;
    const colors = BILLBOARD_PALETTE[design];
    const label = BILLBOARD_LABELS[design];

    // Panel background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    if (screenH >= 4 && screenW >= 4) {
      // VELOCE gets a distinctive stripe pattern.
      if (design === 'VELOCE') {
        this._drawStripes(ctx, screenX, screenY, screenW, screenH, colors.primary, colors.accent);
      } else {
        // Thin accent border on left + bottom for depth illusion.
        ctx.fillStyle = colors.accent;
        // Top bar (approx 1/4 height)
        const barH = Math.max(1, Math.round(screenH / 4));
        ctx.fillRect(screenX, screenY, screenW, barH);
      }
    }

    // Label text — only when billboard is large enough to read.
    if (screenH >= 8 && screenW >= 12) {
      const fontSize = Math.max(4, Math.min(8, Math.round(screenH * 0.45)));
      ctx.fillStyle = colors.primary;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, screenX + screenW / 2, screenY + screenH * 0.62, screenW - 2);
    }
  }

  /** @internal Draw diagonal stripes for the VELOCE billboard. */
  private _drawStripes(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color1: string,
    color2: string
  ): void {
    const stripeW = Math.max(2, Math.round(w / 5));
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? color1 : color2;
      const sx = x + i * stripeW;
      const sw = i === 4 ? w - i * stripeW : stripeW;
      if (sw > 0) ctx.fillRect(sx, y, sw, h);
    }
  }
}
