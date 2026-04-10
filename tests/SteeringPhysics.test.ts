import { describe, it, expect, beforeEach } from 'vitest';
import { SteeringPhysics } from '../src/physics/SteeringPhysics';

describe('SteeringPhysics', () => {
  let steering: SteeringPhysics;

  beforeEach(() => {
    steering = new SteeringPhysics();
  });

  describe('initial state', () => {
    it('starts at road centre (playerX = 0)', () => {
      expect(steering.playerX).toBe(0);
    });
  });

  describe('steering input', () => {
    it('moves right when right key is held', () => {
      steering.update(100, false, true, 225, 0);
      expect(steering.playerX).toBeGreaterThan(0);
    });

    it('moves left when left key is held', () => {
      steering.update(100, true, false, 225, 0);
      expect(steering.playerX).toBeLessThan(0);
    });

    it('does not move laterally without input on a straight', () => {
      steering.update(100, false, false, 225, 0);
      expect(steering.playerX).toBe(0);
    });

    it('cancels out when both left and right are held', () => {
      steering.update(100, true, true, 225, 0);
      // Net steer input is 0; only drift applies (0 on straight)
      expect(steering.playerX).toBe(0);
    });
  });

  describe('speed sensitivity', () => {
    it('produces no lateral movement at zero speed', () => {
      steering.update(100, true, false, 0, 0);
      expect(steering.playerX).toBe(0);
    });

    it('moves faster at higher speed than at lower speed', () => {
      const lowSpeed = new SteeringPhysics();
      const highSpeed = new SteeringPhysics();
      lowSpeed.update(100, false, true, 50, 0);
      highSpeed.update(100, false, true, 225, 0);
      expect(Math.abs(highSpeed.playerX)).toBeGreaterThan(Math.abs(lowSpeed.playerX));
    });

    it('steering rate is proportional to speed fraction', () => {
      const halfSpeed = new SteeringPhysics();
      const fullSpeed = new SteeringPhysics();
      halfSpeed.update(1000, false, true, 112.5, 0);
      fullSpeed.update(1000, false, true, 225, 0);
      // Full speed should move approximately twice as far as half speed
      expect(fullSpeed.playerX).toBeCloseTo(halfSpeed.playerX * 2, 1);
    });
  });

  describe('curve drift', () => {
    it('drifts right on a right curve (positive curvePower)', () => {
      steering.update(1000, false, false, 225, 0.06);
      expect(steering.playerX).toBeGreaterThan(0);
    });

    it('drifts left on a left curve (negative curvePower)', () => {
      steering.update(1000, false, false, 225, -0.06);
      expect(steering.playerX).toBeLessThan(0);
    });

    it('no drift on a straight (curvePower = 0)', () => {
      steering.update(1000, false, false, 225, 0);
      expect(steering.playerX).toBe(0);
    });

    it('drift rate scales with speed', () => {
      const halfSpeed = new SteeringPhysics();
      const fullSpeed = new SteeringPhysics();
      halfSpeed.update(1000, false, false, 112.5, 0.06);
      fullSpeed.update(1000, false, false, 225, 0.06);
      expect(fullSpeed.playerX).toBeGreaterThan(halfSpeed.playerX);
    });

    it('drift rate scales with curve power', () => {
      const weakCurve = new SteeringPhysics();
      const strongCurve = new SteeringPhysics();
      weakCurve.update(1000, false, false, 225, 0.015);
      strongCurve.update(1000, false, false, 225, 0.08);
      expect(strongCurve.playerX).toBeGreaterThan(weakCurve.playerX);
    });

    it('drift magnitude at max speed on sharpest curve is ~70 px/s', () => {
      // curvePower=0.08, speedMph=225 → expected ~70 px/s
      const expectedRate = 0.08 * 225 * SteeringPhysics.CURVE_DRIFT_FACTOR;
      steering.update(1000, false, false, 225, 0.08);
      expect(steering.playerX).toBeCloseTo(expectedRate, 0);
    });
  });

  describe('steering and drift interaction', () => {
    it('steering into a right curve can cancel the drift', () => {
      // Start at centre, apply left steering against a right curve drift.
      // With enough left steer the car should not drift right.
      const s = new SteeringPhysics();
      // Run for 1 second; left steer at full speed vs right curve drift.
      const frames = 60;
      const dtFrame = 1000 / frames;
      for (let i = 0; i < frames; i++) {
        s.update(dtFrame, true, false, 225, 0.06);
      }
      // Left steer dominates the moderate right curve — car ends up left of centre.
      expect(s.playerX).toBeLessThan(0);
    });
  });

  describe('reset', () => {
    it('resets playerX to zero', () => {
      steering.update(1000, false, true, 225, 0);
      expect(steering.playerX).not.toBe(0);
      steering.reset();
      expect(steering.playerX).toBe(0);
    });
  });

  describe('nudge()', () => {
    it('shifts playerX by a positive delta', () => {
      steering.nudge(20);
      expect(steering.playerX).toBe(20);
    });

    it('shifts playerX by a negative delta', () => {
      steering.nudge(-15);
      expect(steering.playerX).toBe(-15);
    });

    it('nudges are additive with existing position', () => {
      steering.update(1000, false, true, 225, 0); // move right
      const before = steering.playerX;
      steering.nudge(5);
      expect(steering.playerX).toBeCloseTo(before + 5, 5);
    });

    it('nudge(0) does not change position', () => {
      steering.update(100, false, true, 225, 0);
      const before = steering.playerX;
      steering.nudge(0);
      expect(steering.playerX).toBe(before);
    });
  });

  describe('constants', () => {
    it('MAX_STEER_RATE is 220 px/s', () => {
      expect(SteeringPhysics.MAX_STEER_RATE).toBe(220);
    });

    it('at max speed full steer moves ~220 px in 1 second', () => {
      // 1 second of full right steer at top speed, no curve
      const frames = 60;
      const dtFrame = 1000 / frames;
      for (let i = 0; i < frames; i++) {
        steering.update(dtFrame, false, true, 225, 0);
      }
      expect(steering.playerX).toBeCloseTo(220, 0);
    });
  });
});
