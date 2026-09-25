// terrainGeometry - pure builder for the striped grass ribbon that flanks the road.
// Near the road it is level with the tarmac, then it falls away to the flat ground plane.
import type { CenterlinePoint } from '../sim/Track';
import { KERB_WIDTH, VERGE_WIDTH, TERRAIN_HALF_WIDTH, groundHeight } from '../sim/scenery';

export interface TerrainArrays {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

/** Length in metres of one light/dark grass stripe, as in the arcade's alternating verges. */
export const GRASS_STRIPE = 12;

type RGB = readonly [number, number, number];

export interface TerrainPalette {
  grass: readonly [RGB, RGB];
  verge: readonly [RGB, RGB];
}

export const DEFAULT_PALETTE: TerrainPalette = {
  grass: [
    [0.2, 0.55, 0.22],
    [0.17, 0.49, 0.2],
  ],
  verge: [
    [0.35, 0.6, 0.27],
    [0.3, 0.55, 0.25],
  ],
};

export function buildTerrainArrays(
  points: CenterlinePoint[],
  roadWidth: number,
  planeY: number,
  palette: TerrainPalette = DEFAULT_PALETTE
): TerrainArrays {
  const edge = roadWidth / 2 + KERB_WIDTH;
  const flatEnd = edge + VERGE_WIDTH;
  // Lateral spans (from, to) from left to right, skipping the road itself.
  const spans: Array<[number, number, boolean]> = [
    [-TERRAIN_HALF_WIDTH, -flatEnd, false],
    [-flatEnd, -edge, true],
    [edge, flatEnd, true],
    [flatEnd, TERRAIN_HALF_WIDTH, false],
  ];
  const rows = points.length - 1;
  const quads = rows * spans.length;
  const positions = new Float32Array(quads * 4 * 3);
  const colors = new Float32Array(quads * 4 * 3);
  const indices = new Uint32Array(quads * 6);

  let v = 0;
  let q = 0;
  for (let i = 0; i < rows; i++) {
    const a = points[i];
    const b = points[i + 1];
    const stripe = Math.floor(a.s / GRASS_STRIPE) % 2 === 0;
    for (const [from, to, verge] of spans) {
      const pair = verge ? palette.verge : palette.grass;
      const c = stripe ? pair[0] : pair[1];
      const base = v / 3;
      const corners: Array<[CenterlinePoint, number]> = [
        [a, from],
        [a, to],
        [b, to],
        [b, from],
      ];
      for (const [p, off] of corners) {
        positions[v] = p.x - Math.cos(p.heading) * off;
        positions[v + 1] = groundHeight(p.y, planeY, off, roadWidth);
        positions[v + 2] = p.z - Math.sin(p.heading) * off;
        colors[v] = c[0];
        colors[v + 1] = c[1];
        colors[v + 2] = c[2];
        v += 3;
      }
      indices.set([base, base + 1, base + 2, base, base + 2, base + 3], q);
      q += 6;
    }
  }
  return { positions, colors, indices };
}
