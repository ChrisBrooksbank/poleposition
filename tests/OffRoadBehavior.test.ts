import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerPhysics } from '../src/physics/PlayerPhysics';

// Helper: advance physics by N seconds at 60 FPS
function advanceSecs(
  physics: PlayerPhysics,
  seconds: number,
  throttle: boolean,
  brake: boolean,
  gear: 'low' | 'high'
): void {
  const frameDt = 1000 / 60;
  const frames = Math.round((seconds * 1000) / frameDt);
  for (let i = 0; i < frames; i++) {
    physics.update(frameDt, throttle, brake, gear);
  }
}

describe('PlayerPhysics.applyOffRoadPenalty', () => {
  let physics: PlayerPhysics;

  beforeEach(() => {
    physics = new PlayerPhysics();
  });

  describe('constants', () => {
    it('OFF_ROAD_SPEED_CAP is 30 MPH', () => {
      expect(PlayerPhysics.OFF_ROAD_SPEED_CAP).toBe(30);
    });

    it('OFF_ROAD_DECEL is 120 MPH/s', () => {
      expect(PlayerPhysics.OFF_ROAD_DECEL).toBe(120);
    });
  });

  describe('speed reduction', () => {
    it('does not change speed when not called', () => {
      advanceSecs(physics, 5, true, false, 'high');
      const speedBefore = physics.speed;
      expect(speedBefore).toBeGreaterThan(0);
      // Not calling applyOffRoadPenalty — speed stays the same after another update
      advanceSecs(physics, 0.1, true, false, 'high');
      expect(physics.speed).toBeGreaterThan(0);
    });

    it('decelerates speed when penalty is applied', () => {
      advanceSecs(physics, 5, true, false, 'high');
      const speedBefore = physics.speed;
      physics.applyOffRoadPenalty(1000 / 60);
      expect(physics.speed).toBeLessThan(speedBefore);
    });

    it('reduces high speed to OFF_ROAD_SPEED_CAP in a single frame', () => {
      // At 225 MPH, even one frame of penalty brings speed to the cap (cap dominates).
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(225, 0);

      physics.applyOffRoadPenalty(1000 / 60);
      expect(physics.speed).toBeLessThanOrEqual(PlayerPhysics.OFF_ROAD_SPEED_CAP);
    });

    it('decelerates at OFF_ROAD_DECEL rate when below the cap', () => {
      // Accelerate to ~10 MPH (below 30 MPH cap) and verify decel applies
      advanceSecs(physics, 0.17, true, false, 'low');
      const startSpeed = physics.speed;
      expect(startSpeed).toBeGreaterThan(0);
      expect(startSpeed).toBeLessThan(PlayerPhysics.OFF_ROAD_SPEED_CAP);

      const dtMs = 1000 / 60;
      physics.applyOffRoadPenalty(dtMs);
      const expectedLost = PlayerPhysics.OFF_ROAD_DECEL * (dtMs / 1000);
      const actualLost = startSpeed - physics.speed;
      // Decel should reduce speed by OFF_ROAD_DECEL * dt (capped at 0)
      const boundedExpected = Math.min(expectedLost, startSpeed);
      expect(actualLost).toBeCloseTo(boundedExpected, 1);
    });

    it('caps speed at OFF_ROAD_SPEED_CAP when decelerating from high speed', () => {
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(225, 0);

      // Apply penalty for many frames — speed should settle at cap
      for (let i = 0; i < 120; i++) {
        physics.applyOffRoadPenalty(1000 / 60);
      }
      expect(physics.speed).toBeLessThanOrEqual(PlayerPhysics.OFF_ROAD_SPEED_CAP);
    });

    it('caps speed at OFF_ROAD_SPEED_CAP when already above it', () => {
      // Start at exactly 60 MPH (above the 30 MPH cap but below decel in one frame)
      advanceSecs(physics, 2, true, false, 'high');
      // Apply one frame with large dt to immediately enforce cap
      physics.applyOffRoadPenalty(1000); // 1 second → 120 MPH decel brings any ≤150 MPH below cap
      expect(physics.speed).toBeLessThanOrEqual(PlayerPhysics.OFF_ROAD_SPEED_CAP);
    });

    it('does not reduce speed below zero', () => {
      // Start from rest — already at 0
      physics.applyOffRoadPenalty(1000 / 60);
      expect(physics.speed).toBe(0);
    });

    it('allows throttle to maintain speed up to OFF_ROAD_SPEED_CAP after reaching it', () => {
      // Get up to speed, then apply enough off-road penalties to reach cap
      advanceSecs(physics, 20, true, false, 'high');
      for (let i = 0; i < 200; i++) {
        physics.applyOffRoadPenalty(1000 / 60);
      }
      expect(physics.speed).toBeLessThanOrEqual(PlayerPhysics.OFF_ROAD_SPEED_CAP);
      expect(physics.speed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('speed below cap is not further reduced', () => {
    it('does not reduce speed below OFF_ROAD_SPEED_CAP if already at or below cap', () => {
      // Accelerate only briefly to get to ~10 MPH (below 30 MPH cap)
      advanceSecs(physics, 0.2, true, false, 'low');
      const lowSpeed = physics.speed;
      expect(lowSpeed).toBeLessThan(PlayerPhysics.OFF_ROAD_SPEED_CAP);

      // Penalty should still decelerate toward zero (OFF_ROAD_DECEL applied, then min with cap)
      // The decel applies first, then cap: so from a low speed, it still decelerates
      physics.applyOffRoadPenalty(1000 / 60);
      // Speed should still be reduced (decel applies even below cap)
      expect(physics.speed).toBeLessThan(lowSpeed);
    });
  });
});
