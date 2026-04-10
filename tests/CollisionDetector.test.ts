import { describe, it, expect, beforeEach } from 'vitest';
import {
  CollisionDetector,
  PLAYER_CAR_Z_HALF,
  PLAYER_CAR_X_HALF,
  BILLBOARD_Z_HALF,
  BILLBOARD_X_HALF,
  AI_CAR_Z_HALF,
  AI_CAR_X_HALF,
  type AICar,
} from '../src/physics/CollisionDetector';
import { BILLBOARDS } from '../src/track/billboards';
import { TRACK_LENGTH } from '../src/track/fujiSpeedway';

describe('CollisionDetector', () => {
  let detector: CollisionDetector;

  beforeEach(() => {
    detector = new CollisionDetector();
  });

  // -------------------------------------------------------------------------
  // Billboard collision
  // -------------------------------------------------------------------------

  describe('checkBillboards', () => {
    // Use the first billboard in the array as a reference target
    const bb = BILLBOARDS[0];

    const combinedZHalf = BILLBOARD_Z_HALF + PLAYER_CAR_Z_HALF;
    const combinedXHalf = BILLBOARD_X_HALF + PLAYER_CAR_X_HALF;

    it('detects collision when player is directly on a billboard', () => {
      expect(detector.checkBillboards(bb.trackZ, bb.lateralOffset)).toBe(true);
    });

    it('detects collision at the Z boundary (just inside)', () => {
      const playerZ = bb.trackZ - (combinedZHalf - 0.1);
      expect(detector.checkBillboards(playerZ, bb.lateralOffset)).toBe(true);
    });

    it('no collision just outside the Z boundary', () => {
      const playerZ = bb.trackZ - (combinedZHalf + 0.1);
      expect(detector.checkBillboards(playerZ, bb.lateralOffset)).toBe(false);
    });

    it('no collision just outside the X boundary (away from road edge)', () => {
      // Player is far from the billboard laterally
      const playerX = bb.lateralOffset - (combinedXHalf + 1);
      expect(detector.checkBillboards(bb.trackZ, playerX)).toBe(false);
    });

    it('detects collision at the X boundary (just inside)', () => {
      const playerX = bb.lateralOffset - (combinedXHalf - 1);
      expect(detector.checkBillboards(bb.trackZ, playerX)).toBe(true);
    });

    it('no collision when player is on road and far from all billboards', () => {
      // Far from any billboard in Z
      expect(detector.checkBillboards(0, 0)).toBe(false);
    });

    it('no collision when Z matches but player is far from billboard laterally', () => {
      // Player at road centre — billboard is at ±130, combined X is ~46
      // Road-centre (0) to right billboard (130) = 130 units apart > combinedXHalf
      expect(detector.checkBillboards(bb.trackZ, 0)).toBe(false);
    });

    it('no collision when player is behind the billboard beyond the Z zone', () => {
      const playerZ = bb.trackZ + combinedZHalf + 1;
      expect(detector.checkBillboards(playerZ, bb.lateralOffset)).toBe(false);
    });

    it('handles lap wrap-around: billboard near start detected at end of next lap', () => {
      // Player has completed one full lap and is approaching the billboard again.
      // playerZ is set so the billboard is exactly (combinedZHalf - 1) metres ahead.
      const nearStartBB = BILLBOARDS[0]; // trackZ = 150
      const playerZ = TRACK_LENGTH + nearStartBB.trackZ - (combinedZHalf - 1);
      // relZ wraps to combinedZHalf - 1 (just inside the collision zone)
      expect(detector.checkBillboards(playerZ, nearStartBB.lateralOffset)).toBe(true);
    });

    it('detects collision with any billboard in the array, not just the first', () => {
      // Use a billboard that is not the first one
      const lastBB = BILLBOARDS[BILLBOARDS.length - 1];
      expect(detector.checkBillboards(lastBB.trackZ, lastBB.lateralOffset)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // AI car collision
  // -------------------------------------------------------------------------

  describe('checkAICars', () => {
    const combinedZHalf = AI_CAR_Z_HALF + PLAYER_CAR_Z_HALF;
    const combinedXHalf = AI_CAR_X_HALF + PLAYER_CAR_X_HALF;

    const playerZ = 500;
    const playerX = 0;

    it('returns false when there are no AI cars', () => {
      expect(detector.checkAICars(playerZ, playerX, [])).toBe(false);
    });

    it('detects collision when AI car is at the same position', () => {
      const cars: AICar[] = [{ z: playerZ, x: playerX }];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(true);
    });

    it('detects collision at the Z boundary (just inside)', () => {
      const cars: AICar[] = [{ z: playerZ + combinedZHalf - 0.1, x: playerX }];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(true);
    });

    it('no collision just outside the Z boundary', () => {
      const cars: AICar[] = [{ z: playerZ + combinedZHalf + 0.1, x: playerX }];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(false);
    });

    it('detects collision at the X boundary (just inside)', () => {
      const cars: AICar[] = [{ z: playerZ, x: playerX + combinedXHalf - 1 }];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(true);
    });

    it('no collision just outside the X boundary', () => {
      const cars: AICar[] = [{ z: playerZ, x: playerX + combinedXHalf + 1 }];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(false);
    });

    it('detects collision with one matching car among several non-colliding cars', () => {
      const cars: AICar[] = [
        { z: playerZ + 500, x: playerX }, // far ahead — no collision
        { z: playerZ - 500, x: playerX }, // far behind — no collision
        { z: playerZ + 1, x: playerX + 1 }, // close — collision
      ];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(true);
    });

    it('no collision when all AI cars are far away', () => {
      const cars: AICar[] = [
        { z: playerZ + 1000, x: 0 },
        { z: playerZ - 1000, x: 0 },
        { z: playerZ, x: playerX + 200 }, // far laterally
      ];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(false);
    });

    it('detects collision with AI car behind the player (negative relZ)', () => {
      const cars: AICar[] = [{ z: playerZ - (combinedZHalf - 0.1), x: playerX }];
      expect(detector.checkAICars(playerZ, playerX, cars)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Constants sanity checks
  // -------------------------------------------------------------------------

  describe('collision box constants', () => {
    it('player car Z half is positive', () => {
      expect(PLAYER_CAR_Z_HALF).toBeGreaterThan(0);
    });

    it('player car X half is positive', () => {
      expect(PLAYER_CAR_X_HALF).toBeGreaterThan(0);
    });

    it('billboard Z half is larger than player car Z half', () => {
      expect(BILLBOARD_Z_HALF).toBeGreaterThan(PLAYER_CAR_Z_HALF);
    });

    it('AI car combined Z half is at least as large as player car Z half', () => {
      expect(AI_CAR_Z_HALF + PLAYER_CAR_Z_HALF).toBeGreaterThanOrEqual(PLAYER_CAR_Z_HALF);
    });

    it('AI car combined X half allows hitting head-on opponents', () => {
      // Combined X should be at least as wide as one car
      expect(AI_CAR_X_HALF + PLAYER_CAR_X_HALF).toBeGreaterThan(PLAYER_CAR_X_HALF);
    });
  });
});
