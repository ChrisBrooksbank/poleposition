/**
 * CollisionDetector — road-space collision detection for the player car.
 *
 * All positions use the same coordinate system throughout:
 *   - World-Z: absolute track position in metres (playerZ, billboard.trackZ)
 *   - Lateral X: road-space pixels at perspective scale=1 (playerX, lateralOffset)
 *     Road centre = 0, road edge = ±ROAD_HALF_WIDTH (110), billboard zone ≈ ±130.
 *
 * Collision is an axis-aligned bounding box (AABB) test in road space:
 *   Overlap in Z AND overlap in X → collision.
 */

import { BILLBOARDS } from '../track/billboards';
import { TRACK_LENGTH } from '../track/fujiSpeedway';

// ---------------------------------------------------------------------------
// Collision box half-extents
// ---------------------------------------------------------------------------

/** Half-depth of the player car's collision zone (metres). */
export const PLAYER_CAR_Z_HALF = 2;

/** Half-width of the player car's collision zone (road-space pixels at scale=1). */
export const PLAYER_CAR_X_HALF = 16;

/** Half-depth of a billboard's collision zone (metres). */
export const BILLBOARD_Z_HALF = 10;

/**
 * Half-width of a billboard's physical collision zone (road-space pixels).
 *
 * This is the sign/post structure's hitbox — narrower than the visual
 * billboard width so the player can just clip the edge without a crash.
 */
export const BILLBOARD_X_HALF = 30;

/** Half-depth of an AI car's collision zone (metres). */
export const AI_CAR_Z_HALF = 8;

/** Half-width of an AI car's collision zone (road-space pixels at scale=1). */
export const AI_CAR_X_HALF = 18;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Road-space position of a single AI car. */
export interface AICar {
  /** Absolute world-Z position in metres. */
  z: number;
  /**
   * Lateral road-space position in screen-pixels at perspective scale=1.
   * Same units as the player's steering.playerX.
   */
  x: number;
}

// ---------------------------------------------------------------------------
// CollisionDetector
// ---------------------------------------------------------------------------

export class CollisionDetector {
  /**
   * Check if the player has collided with any roadside billboard.
   *
   * Billboard positions wrap every lap, so the check handles the lap
   * boundary correctly (same approach as BillboardRenderer._projectOne).
   *
   * @param playerZ  Player's absolute world-Z in metres.
   * @param playerX  Player's lateral position in road-space pixels.
   * @returns true if a collision with at least one billboard is detected.
   */
  checkBillboards(playerZ: number, playerX: number): boolean {
    const combinedZHalf = BILLBOARD_Z_HALF + PLAYER_CAR_Z_HALF;
    const combinedXHalf = BILLBOARD_X_HALF + PLAYER_CAR_X_HALF;

    for (const bb of BILLBOARDS) {
      // Compute signed relative Z, wrapping at the lap boundary.
      const rawRel = (((bb.trackZ - playerZ) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
      const relZ = rawRel > TRACK_LENGTH / 2 ? rawRel - TRACK_LENGTH : rawRel;

      if (Math.abs(relZ) > combinedZHalf) continue;
      if (Math.abs(playerX - bb.lateralOffset) > combinedXHalf) continue;

      return true;
    }
    return false;
  }

  /**
   * Check if the player has collided with any AI car.
   *
   * @param playerZ  Player's absolute world-Z in metres.
   * @param playerX  Player's lateral position in road-space pixels.
   * @param aiCars   Array of AI cars with their current road-space positions.
   * @returns true if a collision with at least one AI car is detected.
   */
  checkAICars(playerZ: number, playerX: number, aiCars: readonly AICar[]): boolean {
    const combinedZHalf = AI_CAR_Z_HALF + PLAYER_CAR_Z_HALF;
    const combinedXHalf = AI_CAR_X_HALF + PLAYER_CAR_X_HALF;

    for (const car of aiCars) {
      const relZ = car.z - playerZ;

      if (Math.abs(relZ) > combinedZHalf) continue;
      if (Math.abs(playerX - car.x) > combinedXHalf) continue;

      return true;
    }
    return false;
  }
}
