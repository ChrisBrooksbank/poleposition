// scenery - pure, deterministic placement of roadside objects (no rendering imports).
// The same layout later feeds collision (billboards) as well as the Three.js scene.

import type { Track } from './Track';

export type SceneryKind = 'billboard' | 'post' | 'tree' | 'grandstand' | 'gantry' | 'startline';

export interface SceneryItem {
  kind: SceneryKind;
  /** Distance along the lap in metres. */
  s: number;
  /** Lateral offset from the centreline in metres; positive is the driver's right. */
  lateral: number;
  /** Billboard brand text. */
  brand?: string;
  /** Width along the road's cross-direction in metres (billboards). */
  width?: number;
  /** Size multiplier (trees). */
  scale?: number;
}

/** Original fictional sponsors (the arcade's real brands are not reused). */
export const BILLBOARD_BRANDS = [
  'TURBO',
  'VELOX',
  'NOVA OIL',
  'KINETIC',
  'APEX',
  'ZENITH',
  'HALCYON',
] as const;

/** Width of the kerb strip either side of the road, matching the road mesh. */
export const KERB_WIDTH = 1.2;
/** Width of flat verge outside the kerb before the embankment starts falling away. */
export const VERGE_WIDTH = 8;
/** Lateral distance from the centreline at which the terrain ribbon meets the flat plane. */
export const TERRAIN_HALF_WIDTH = 60;

export const BILLBOARD_SPACING = 110;
export const BILLBOARD_WIDTH = 8;
export const POST_SPACING = 40;
export const START_LINE_S = 0;

/** Small deterministic PRNG (mulberry32) so layouts never change between runs. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Terrain height at a lateral offset, given the road height at the same distance. */
export function groundHeight(
  roadY: number,
  planeY: number,
  lateral: number,
  roadWidth: number
): number {
  const edge = roadWidth / 2 + KERB_WIDTH;
  const flatEnd = edge + VERGE_WIDTH;
  const d = Math.abs(lateral);
  if (d <= edge) return roadY;
  if (d <= flatEnd) return roadY - 0.3;
  const t = Math.min((d - flatEnd) / (TERRAIN_HALF_WIDTH - flatEnd), 1);
  return roadY - 0.3 + (planeY - (roadY - 0.3)) * t;
}

export function buildSceneryLayout(track: Track): SceneryItem[] {
  const items: SceneryItem[] = [];
  const half = track.def.roadWidth / 2 + KERB_WIDTH;
  const rand = seededRandom(1982);

  items.push({ kind: 'startline', s: START_LINE_S, lateral: 0 });
  items.push({ kind: 'gantry', s: START_LINE_S, lateral: 0 });
  items.push({ kind: 'grandstand', s: 180, lateral: -(half + 14), width: 120 });
  items.push({ kind: 'grandstand', s: 420, lateral: half + 14, width: 90 });

  for (let s = POST_SPACING / 2, i = 0; s < track.length; s += POST_SPACING, i++) {
    items.push({ kind: 'post', s, lateral: -(half + 1.5) });
    items.push({ kind: 'post', s, lateral: half + 1.5 });
  }

  for (let s = 60, i = 0; s < track.length - 30; s += BILLBOARD_SPACING, i++) {
    const side = i % 2 === 0 ? 1 : -1;
    items.push({
      kind: 'billboard',
      s,
      lateral: side * (half + 5),
      brand: BILLBOARD_BRANDS[i % BILLBOARD_BRANDS.length],
      width: BILLBOARD_WIDTH,
    });
  }

  for (let s = 10; s < track.length - 14; s += 18) {
    for (const side of [-1, 1]) {
      if (rand() < 0.35) continue;
      items.push({
        kind: 'tree',
        s: s + rand() * 14,
        lateral: side * (half + VERGE_WIDTH + 4 + rand() * 40),
        scale: 0.7 + rand() * 0.9,
      });
    }
  }

  return items;
}
