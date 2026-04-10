import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerPhysics, DEFAULT_TOP_SPEED_MPH } from '../src/physics/PlayerPhysics';

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

describe('PlayerPhysics', () => {
  let physics: PlayerPhysics;

  beforeEach(() => {
    physics = new PlayerPhysics();
  });

  describe('initial state', () => {
    it('starts at zero speed', () => {
      expect(physics.speed).toBe(0);
    });

    it('defaults to 225 MPH top speed in high gear', () => {
      expect(physics.topSpeedHighGear).toBe(DEFAULT_TOP_SPEED_MPH);
      expect(physics.topSpeedHighGear).toBe(225);
    });

    it('low gear cap is half of high gear top speed', () => {
      expect(physics.topSpeedLowGear).toBe(112.5);
    });

    it('accepts a custom top speed', () => {
      const fast = new PlayerPhysics(244);
      expect(fast.topSpeedHighGear).toBe(244);
      expect(fast.topSpeedLowGear).toBe(122);
    });
  });

  describe('acceleration', () => {
    it('increases speed when throttle is pressed in high gear', () => {
      physics.update(1000 / 60, true, false, 'high');
      expect(physics.speed).toBeGreaterThan(0);
    });

    it('increases speed when throttle is pressed in low gear', () => {
      physics.update(1000 / 60, true, false, 'low');
      expect(physics.speed).toBeGreaterThan(0);
    });

    it('low gear accelerates faster than high gear from a standing start', () => {
      const lowGear = new PlayerPhysics();
      const highGear = new PlayerPhysics();
      const dt = 1000 / 60;
      lowGear.update(dt, true, false, 'low');
      highGear.update(dt, true, false, 'high');
      expect(lowGear.speed).toBeGreaterThan(highGear.speed);
    });

    it('low gear acceleration rate matches LOW_GEAR_ACCEL constant', () => {
      const dtSec = 1; // 1 second
      physics.update(dtSec * 1000, true, false, 'low');
      expect(physics.speed).toBeCloseTo(PlayerPhysics.LOW_GEAR_ACCEL, 0);
    });

    it('high gear acceleration rate matches HIGH_GEAR_ACCEL constant', () => {
      const dtSec = 1;
      physics.update(dtSec * 1000, true, false, 'high');
      expect(physics.speed).toBeCloseTo(PlayerPhysics.HIGH_GEAR_ACCEL, 0);
    });
  });

  describe('top speed caps', () => {
    it('low gear does not exceed half the top speed', () => {
      advanceSecs(physics, 10, true, false, 'low');
      expect(physics.speed).toBeLessThanOrEqual(physics.topSpeedLowGear + 0.01);
    });

    it('low gear reaches its cap after sustained throttle', () => {
      advanceSecs(physics, 10, true, false, 'low');
      expect(physics.speed).toBeCloseTo(physics.topSpeedLowGear, 0);
    });

    it('high gear does not exceed top speed', () => {
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeLessThanOrEqual(physics.topSpeedHighGear + 0.01);
    });

    it('high gear reaches full top speed after sustained throttle', () => {
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(physics.topSpeedHighGear, 0);
    });
  });

  describe('deceleration', () => {
    it('coasts to a stop when throttle is released', () => {
      // Get up to speed first
      advanceSecs(physics, 5, true, false, 'high');
      const speedBeforeCoast = physics.speed;
      expect(speedBeforeCoast).toBeGreaterThan(0);

      // Coast for 1 second
      advanceSecs(physics, 1, false, false, 'high');
      expect(physics.speed).toBeLessThan(speedBeforeCoast);
    });

    it('coasting decel rate matches COAST_DECEL constant', () => {
      // Force a high speed directly via repeated acceleration
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(225, 0); // at top speed

      const speedBefore = physics.speed;
      const dtSec = 1;
      physics.update(dtSec * 1000, false, false, 'high');
      const lost = speedBefore - physics.speed;
      expect(lost).toBeCloseTo(PlayerPhysics.COAST_DECEL, 0);
    });

    it('braking decelerates faster than coasting', () => {
      const coastPhysics = new PlayerPhysics();
      const brakePhysics = new PlayerPhysics();

      // Both at same speed
      advanceSecs(coastPhysics, 20, true, false, 'high');
      advanceSecs(brakePhysics, 20, true, false, 'high');

      advanceSecs(coastPhysics, 2, false, false, 'high');
      advanceSecs(brakePhysics, 2, false, true, 'high');

      expect(brakePhysics.speed).toBeLessThan(coastPhysics.speed);
    });

    it('braking decel rate matches BRAKE_DECEL constant', () => {
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(225, 0);

      const speedBefore = physics.speed;
      physics.update(1000, false, true, 'high');
      const lost = speedBefore - physics.speed;
      expect(lost).toBeCloseTo(PlayerPhysics.BRAKE_DECEL, 0);
    });

    it('speed never goes below zero when coasting from rest', () => {
      advanceSecs(physics, 30, false, false, 'high');
      expect(physics.speed).toBe(0);
    });

    it('speed never goes below zero when braking from rest', () => {
      physics.update(5000, false, true, 'high');
      expect(physics.speed).toBe(0);
    });
  });

  describe('gear switching', () => {
    it('shifting down from high gear at high speed with throttle held decelerates to low gear cap', () => {
      // Reach full high-gear speed
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(225, 0);

      // Shift to low gear while holding throttle — engine can't push past cap, excess speed sheds
      advanceSecs(physics, 20, true, false, 'low');
      expect(physics.speed).toBeCloseTo(physics.topSpeedLowGear, 0);
    });

    it('shifting down from high gear at high speed while coasting decelerates below the cap', () => {
      // Reach full high-gear speed
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(225, 0);

      // Coast in low gear — speed passes through the low-gear cap and continues to 0
      // At 20 MPH/s coast, need >5.6s to drop from 225 to below 112.5
      advanceSecs(physics, 6, false, false, 'low');
      // After 6 seconds of coast (20 MPH/s): 225 - 120 = 105 < 112.5
      expect(physics.speed).toBeLessThan(physics.topSpeedLowGear);
    });

    it('shifting down while holding throttle still decelerates to low gear cap', () => {
      // Reach full high-gear speed
      advanceSecs(physics, 20, true, false, 'high');

      // Throttle + low gear — speed should drop to low gear cap
      advanceSecs(physics, 20, true, false, 'low');
      expect(physics.speed).toBeCloseTo(physics.topSpeedLowGear, 0);
    });

    it('shifting up from low gear allows acceleration to high gear top speed', () => {
      // Max out low gear
      advanceSecs(physics, 10, true, false, 'low');
      expect(physics.speed).toBeCloseTo(physics.topSpeedLowGear, 0);

      // Switch to high gear and continue throttle
      advanceSecs(physics, 20, true, false, 'high');
      expect(physics.speed).toBeCloseTo(physics.topSpeedHighGear, 0);
    });
  });

  describe('brake overrides throttle', () => {
    it('decelerates even when both throttle and brake are pressed', () => {
      advanceSecs(physics, 5, true, false, 'high');
      const speedBefore = physics.speed;

      // Apply both throttle and brake
      physics.update(1000 / 60, true, true, 'high');
      expect(physics.speed).toBeLessThan(speedBefore);
    });
  });

  describe('reset', () => {
    it('resets speed to zero', () => {
      advanceSecs(physics, 5, true, false, 'high');
      expect(physics.speed).toBeGreaterThan(0);
      physics.reset();
      expect(physics.speed).toBe(0);
    });
  });
});
