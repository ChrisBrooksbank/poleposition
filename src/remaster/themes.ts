// themes - per-course look: sky, terrain colours, backdrop and tree style.
import type { CourseId } from '../sim/courses';

export type RGB = readonly [number, number, number];
export type Backdrop = 'fuji' | 'hills';
export type TreeStyle = 'pine' | 'round' | 'palm';

export interface Theme {
  skyZenith: number;
  /** Horizon colour; also used for fog and the tint of distant scenery. */
  haze: number;
  /** Ground beyond the terrain ribbon (grass, dry earth or sea). */
  farGround: number;
  /** Outer terrain bands (light/dark stripes) and inner verge bands. */
  grass: readonly [RGB, RGB];
  verge: readonly [RGB, RGB];
  backdrop: Backdrop;
  /** Distant hills: [foot/forest, rock, snow]. */
  hills: readonly [number, number, number];
  trees: TreeStyle;
  /** Fraction of tree slots that are filled (0-1). */
  treeDensity: number;
  fogFar: number;
}

export const THEMES: Record<CourseId, Theme> = {
  fuji: {
    skyZenith: 0x2f7fe0,
    haze: 0xcfe6ff,
    farGround: 0x2f8a3a,
    grass: [
      [0.2, 0.55, 0.22],
      [0.17, 0.49, 0.2],
    ],
    verge: [
      [0.35, 0.6, 0.27],
      [0.3, 0.55, 0.25],
    ],
    backdrop: 'fuji',
    hills: [0x3d6a55, 0x4c5f86, 0xf4f8ff],
    trees: 'pine',
    treeDensity: 0.65,
    fogFar: 3500,
  },
  test: {
    skyZenith: 0x5b90d8,
    haze: 0xece3cb,
    farGround: 0x9a8a55,
    grass: [
      [0.6, 0.53, 0.3],
      [0.55, 0.48, 0.27],
    ],
    verge: [
      [0.72, 0.65, 0.4],
      [0.67, 0.6, 0.37],
    ],
    backdrop: 'hills',
    hills: [0x8a7a55, 0x9c8d6e, 0xb8ab8c],
    trees: 'round',
    treeDensity: 0.25,
    fogFar: 3800,
  },
  suzuka: {
    skyZenith: 0x3a80d8,
    haze: 0xd5e8ff,
    farGround: 0x2b7d33,
    grass: [
      [0.16, 0.5, 0.2],
      [0.13, 0.44, 0.18],
    ],
    verge: [
      [0.3, 0.58, 0.25],
      [0.26, 0.52, 0.23],
    ],
    backdrop: 'hills',
    hills: [0x2f6a3f, 0x4d7a5a, 0x7fa58a],
    trees: 'round',
    treeDensity: 0.85,
    fogFar: 3200,
  },
  seaside: {
    skyZenith: 0x2c9be6,
    haze: 0xe2f3ff,
    farGround: 0x1c6fb8,
    grass: [
      [0.86, 0.78, 0.5],
      [0.82, 0.73, 0.46],
    ],
    verge: [
      [0.35, 0.66, 0.3],
      [0.3, 0.6, 0.27],
    ],
    backdrop: 'hills',
    hills: [0x4a86a8, 0x6e9ec0, 0xbcd6ea],
    trees: 'palm',
    treeDensity: 0.45,
    fogFar: 4200,
  },
};
