/**
 * Billboard definitions for Fuji Speedway.
 *
 * Billboards are placed on alternating sides of the road at specific track
 * positions.  Each billboard has a world-Z position, a lateral offset (positive =
 * right side, negative = left side), and a design identifier.
 *
 * The 7 fictional brands replace the original branded billboards:
 *   TURBO      → red/white  (replaces Marlboro)
 *   ZOOM COLA  → blue/red/white (replaces Pepsi)
 *   OPTIC      → red/white  (replaces Canon)
 *   VICTOR     → yellow/blue (replaces Champion)
 *   VELOCE     → stripe pattern (replaces Martini & Rossi)
 *   FUEL+      → yellow/green (replaces Agip)
 *   SPARK      → blue/white  (replaces S.E.V.)
 */

export type BillboardDesign =
  | 'TURBO'
  | 'ZOOM_COLA'
  | 'OPTIC'
  | 'VICTOR'
  | 'VELOCE'
  | 'FUEL_PLUS'
  | 'SPARK';

/** Road-space description of a single billboard. */
export interface Billboard {
  /** Absolute track position in metres (world-Z). */
  trackZ: number;
  /**
   * Lateral offset from road centre in metres.
   * Positive = right side of road (from driver perspective).
   * Negative = left side of road.
   */
  lateralOffset: number;
  /** Which of the 7 fictional billboard designs to render. */
  design: BillboardDesign;
}

/**
 * Billboard world width in world units (same scale as track Z distances).
 * A width of 400 units produces a clearly visible billboard from about
 * 80 units away (the far end of the visible road area at this resolution).
 */
export const BILLBOARD_WORLD_WIDTH = 400;

/**
 * Billboard world height in world units.
 * Aspect ratio is 2:1 (width:height) matching the original arcade look.
 * At perspective scale = CAMERA_DEPTH / relZ, this gives:
 *   relZ=5  → ~34 px   (very close)
 *   relZ=30 → ~6 px    (mid-range)
 *   relZ=80 → ~2 px    (near horizon)
 */
export const BILLBOARD_WORLD_HEIGHT = 200;

/**
 * How far from the road edge (in metres) the billboard centre sits.
 * Billboards are just off the shoulder of the road.
 */
const ROAD_EDGE_OFFSET = 130;

const L = -ROAD_EDGE_OFFSET; // left side
const R = +ROAD_EDGE_OFFSET; // right side

/**
 * All billboard placements around the Fuji Speedway circuit.
 *
 * Positions are spread roughly evenly around the ~4360 m circuit, alternating
 * sides to match the original game's look.  Design is cycled through the 7
 * brands so all variants appear.
 */
export const BILLBOARDS: readonly Billboard[] = [
  // Main straight — a few billboards near the start/finish
  { trackZ: 150, lateralOffset: R, design: 'TURBO' },
  { trackZ: 400, lateralOffset: L, design: 'ZOOM_COLA' },
  { trackZ: 700, lateralOffset: R, design: 'OPTIC' },
  { trackZ: 1000, lateralOffset: L, design: 'VICTOR' },

  // Sharp right turn approach & exit
  { trackZ: 1200, lateralOffset: R, design: 'VELOCE' },
  { trackZ: 1350, lateralOffset: L, design: 'FUEL_PLUS' },
  { trackZ: 1500, lateralOffset: R, design: 'SPARK' },

  // Quick left (S-curve section)
  { trackZ: 1700, lateralOffset: L, design: 'TURBO' },
  { trackZ: 1900, lateralOffset: R, design: 'ZOOM_COLA' },

  // Medium right turn
  { trackZ: 2100, lateralOffset: L, design: 'OPTIC' },
  { trackZ: 2300, lateralOffset: R, design: 'VICTOR' },
  { trackZ: 2500, lateralOffset: L, design: 'VELOCE' },

  // Left hairpin approach (danger zone — more billboards)
  { trackZ: 2700, lateralOffset: R, design: 'FUEL_PLUS' },
  { trackZ: 2800, lateralOffset: L, design: 'SPARK' },
  { trackZ: 2900, lateralOffset: R, design: 'TURBO' },

  // Long gradual right — spread out over ~2 km
  { trackZ: 3100, lateralOffset: L, design: 'ZOOM_COLA' },
  { trackZ: 3400, lateralOffset: R, design: 'OPTIC' },
  { trackZ: 3700, lateralOffset: L, design: 'VICTOR' },
  { trackZ: 4000, lateralOffset: R, design: 'VELOCE' },
  { trackZ: 4200, lateralOffset: L, design: 'FUEL_PLUS' },
];

/** Colour palette for each billboard design. */
export interface BillboardColors {
  /** Background/panel fill colour. */
  bg: string;
  /** Primary text/graphic colour. */
  primary: string;
  /** Secondary accent colour (used for stripes, borders, etc.). */
  accent: string;
}

export const BILLBOARD_PALETTE: Readonly<Record<BillboardDesign, BillboardColors>> = {
  TURBO: { bg: '#cc1111', primary: '#ffffff', accent: '#cc1111' },
  ZOOM_COLA: { bg: '#1144cc', primary: '#ffffff', accent: '#cc1111' },
  OPTIC: { bg: '#ffffff', primary: '#cc1111', accent: '#888888' },
  VICTOR: { bg: '#f0c000', primary: '#003399', accent: '#f0c000' },
  VELOCE: { bg: '#ffffff', primary: '#cc0000', accent: '#003399' },
  FUEL_PLUS: { bg: '#aacc00', primary: '#ffee00', accent: '#005500' },
  SPARK: { bg: '#0055cc', primary: '#ffffff', accent: '#88aaff' },
};
