// roadGeometry - pure builder for the road ribbon (no WebGL), so it can be unit tested.
import type { CenterlinePoint } from '../sim/Track';

export interface RoadArrays {
  /** xyz per vertex. */
  positions: Float32Array;
  /** rgb per vertex. */
  colors: Float32Array;
  indices: Uint32Array;
}

/** Lateral bands from left to right: [innerOffset, outerOffset] in metres from centreline. */
interface Band {
  from: number;
  to: number;
  colorA: [number, number, number];
  colorB: [number, number, number];
}

const KERB = 1.2;
const LINE = 0.25;
/** Width in metres of the dashed line down the middle of the road. */
const CENTRE_LINE = 0.3;
/** Length in metres of one kerb/asphalt colour stripe. */
export const STRIPE = 6;

const ASPHALT_A: [number, number, number] = [0.22, 0.22, 0.24];
const ASPHALT_B: [number, number, number] = [0.25, 0.25, 0.27];
const WHITE: [number, number, number] = [0.95, 0.95, 0.95];
const RED: [number, number, number] = [0.8, 0.1, 0.1];

function bands(half: number): Band[] {
  return [
    { from: -half - KERB, to: -half, colorA: RED, colorB: WHITE },
    { from: -half, to: -half + LINE, colorA: WHITE, colorB: WHITE },
    { from: -half + LINE, to: -CENTRE_LINE / 2, colorA: ASPHALT_A, colorB: ASPHALT_B },
    // Dashed centre line: white for one stripe length, bare asphalt for the next.
    { from: -CENTRE_LINE / 2, to: CENTRE_LINE / 2, colorA: WHITE, colorB: ASPHALT_B },
    { from: CENTRE_LINE / 2, to: half - LINE, colorA: ASPHALT_A, colorB: ASPHALT_B },
    { from: half - LINE, to: half, colorA: WHITE, colorB: WHITE },
    { from: half, to: half + KERB, colorA: RED, colorB: WHITE },
  ];
}

/**
 * Builds a ribbon along the centreline. Each quad has its own four vertices so colour
 * can alternate per stripe without blending. Positive offsets are to the driver's right.
 */
export function buildRoadArrays(points: CenterlinePoint[], roadWidth: number): RoadArrays {
  const rows = points.length - 1;
  const bandList = bands(roadWidth / 2);
  const quads = rows * bandList.length;
  const positions = new Float32Array(quads * 4 * 3);
  const colors = new Float32Array(quads * 4 * 3);
  const indices = new Uint32Array(quads * 6);

  let v = 0;
  let q = 0;
  for (let i = 0; i < rows; i++) {
    const a = points[i];
    const b = points[i + 1];
    const stripe = Math.floor(a.s / STRIPE) % 2 === 0;
    for (const band of bandList) {
      const c = stripe ? band.colorA : band.colorB;
      const corners: Array<[CenterlinePoint, number]> = [
        [a, band.from],
        [a, band.to],
        [b, band.to],
        [b, band.from],
      ];
      const base = v / 3;
      for (const [p, off] of corners) {
        // Right of heading h (h=0 faces +z) is (-cos h, 0, -sin h).
        positions[v] = p.x - Math.cos(p.heading) * off;
        positions[v + 1] = p.y;
        positions[v + 2] = p.z - Math.sin(p.heading) * off;
        colors[v] = c[0];
        colors[v + 1] = c[1];
        colors[v + 2] = c[2];
        v += 3;
      }
      // Wound so the face normal points up (+y).
      indices.set([base, base + 1, base + 2, base, base + 2, base + 3], q);
      q += 6;
    }
  }
  return { positions, colors, indices };
}
