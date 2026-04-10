/**
 * Puddle definitions for Fuji Speedway.
 *
 * Puddles are placed on the road surface at specific track positions.
 * When the player car contacts a puddle, a brief spin-out effect is triggered.
 *
 * Lateral offsets near the road centre make puddles unavoidable at high speed
 * but dodgeable with careful steering.
 */

/** Road-space description of a single puddle. */
export interface Puddle {
  /** Absolute track position in metres (world-Z). */
  trackZ: number;
  /**
   * Lateral offset from road centre in metres.
   * 0 = road centre; positive = right; negative = left.
   * Puddles are kept within ±ROAD_HALF_WIDTH (110) to remain on tarmac.
   */
  lateralOffset: number;
}

/**
 * Puddle world half-width in world units (same scale as lateral X positions).
 * Combined with PUDDLE_X_HALF in CollisionDetector for AABB check.
 */
export const PUDDLE_WORLD_HALF_WIDTH = 18;

/**
 * Puddle world half-depth in metres (along the track, world-Z axis).
 * Combined with PLAYER_CAR_Z_HALF in CollisionDetector for AABB check.
 */
export const PUDDLE_WORLD_HALF_DEPTH = 8;

/**
 * All puddle placements around the Fuji Speedway circuit.
 *
 * Puddles are placed at corners and track sections to reward racing lines.
 * Six puddles spread across the ~4.36 km circuit.
 */
export const PUDDLES: readonly Puddle[] = [
  // Main straight — slightly off-centre to catch fast-straight driving
  { trackZ: 600, lateralOffset: -25 },

  // Sharp right turn exit — outside of the right curve (negative = left = outside)
  { trackZ: 1380, lateralOffset: 35 },

  // Quick left (S-curve) — near centre
  { trackZ: 1700, lateralOffset: -30 },

  // Medium right turn — inside of the corner
  { trackZ: 2250, lateralOffset: 40 },

  // Left hairpin approach — dead centre; hardest to avoid
  { trackZ: 2780, lateralOffset: 0 },

  // Long gradual right — spread far apart, slight offset
  { trackZ: 3500, lateralOffset: -20 },
];
