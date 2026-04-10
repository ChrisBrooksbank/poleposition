import { describe, it, expect, beforeEach } from 'vitest';
import { AICarSystem, AI_CAR_COUNT } from '../src/ai/AICarSystem';
import { TRACK_LENGTH } from '../src/track/fujiSpeedway';
import { MPH_TO_MS } from '../src/physics/SteeringPhysics';

describe('AICarSystem', () => {
  let system: AICarSystem;

  beforeEach(() => {
    system = new AICarSystem();
  });

  describe('initial state', () => {
    it('reports the correct number of AI cars', () => {
      expect(system.count).toBe(AI_CAR_COUNT);
    });

    it('getCars returns exactly AI_CAR_COUNT entries', () => {
      expect(system.getCars()).toHaveLength(AI_CAR_COUNT);
    });

    it('each car starts with a valid world-Z inside [0, TRACK_LENGTH)', () => {
      for (const car of system.getCars()) {
        expect(car.z).toBeGreaterThanOrEqual(0);
        expect(car.z).toBeLessThan(TRACK_LENGTH);
      }
    });

    it('each car has a colorVariant in [0, 3]', () => {
      for (const car of system.getCars()) {
        expect(car.colorVariant).toBeGreaterThanOrEqual(0);
        expect(car.colorVariant).toBeLessThanOrEqual(3);
      }
    });

    it('cars start at distinct Z positions (spread around the track)', () => {
      const positions = system.getCars().map((c) => c.z);
      const unique = new Set(positions.map((z) => Math.round(z)));
      expect(unique.size).toBe(AI_CAR_COUNT);
    });
  });

  describe('update', () => {
    it('advances car Z positions forward over time', () => {
      const before = system.getCars().map((c) => c.z);
      system.update(100); // 100 ms
      const after = system.getCars().map((c) => c.z);

      for (let i = 0; i < AI_CAR_COUNT; i++) {
        // After a 100 ms tick every car must have moved forward (or wrapped).
        // Wrap-safe: compare modulo TRACK_LENGTH.
        const delta = (((after[i] - before[i]) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
        expect(delta).toBeGreaterThan(0);
      }
    });

    it('faster-configured cars advance further per tick than slower ones', () => {
      // Cars are sorted slowest-last in configs: index 6 (155 MPH) vs 3 (185 MPH).
      const before = system.getCars().map((c) => c.z);
      system.update(500); // 500 ms — large enough to produce measurable difference
      const after = system.getCars().map((c) => c.z);

      const delta = (i: number) =>
        (((after[i] - before[i]) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;

      // Car index 3 (185 MPH) should advance more than car index 6 (155 MPH).
      expect(delta(3)).toBeGreaterThan(delta(6));
    });

    it('cars wrap back to within [0, TRACK_LENGTH) after reaching the end', () => {
      // Fast-forward 1000 frames of 16 ms — well past one full lap for every car.
      for (let frame = 0; frame < 1000; frame++) {
        system.update(16);
      }
      for (const car of system.getCars()) {
        expect(car.z).toBeGreaterThanOrEqual(0);
        expect(car.z).toBeLessThan(TRACK_LENGTH);
      }
    });

    it('lateral X stays within a reasonable road-space range after many updates', () => {
      for (let frame = 0; frame < 500; frame++) {
        system.update(16);
      }
      for (const car of system.getCars()) {
        // Road half-width is 110; AI cars should stay well inside the road
        // (base positions ≤ 70 px + wave amplitude ≤ 12 px).
        expect(Math.abs(car.x)).toBeLessThan(120);
      }
    });

    it('speed matches configured MPH: 1 second at 180 MPH advances ~80.5 m', () => {
      // Car index 0 is configured at 180 MPH.
      const before = system.getCars()[0].z;
      system.update(1000); // exactly 1 second
      const after = system.getCars()[0].z;
      const delta = (((after - before) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
      const expected = 180 * MPH_TO_MS; // metres in 1 second
      expect(delta).toBeCloseTo(expected, 0);
    });

    it('lateral position changes across updates (weaving behaviour)', () => {
      const first = system.getCars().map((c) => c.x);
      // Advance enough time to see the wave change (>0.5 s at slowest wave 0.18 Hz).
      system.update(3000);
      const second = system.getCars().map((c) => c.x);

      // At least some cars should have changed lateral position.
      const anyChanged = first.some((x, i) => Math.abs(x - second[i]) > 0.01);
      expect(anyChanged).toBe(true);
    });
  });

  describe('getCars snapshot', () => {
    it('returns a fresh array each call (not the same reference)', () => {
      const a = system.getCars();
      const b = system.getCars();
      expect(a).not.toBe(b);
    });

    it('mutating the returned array does not affect subsequent getCars calls', () => {
      const snap = system.getCars() as Array<{ z: number; x: number; colorVariant: number }>;
      snap[0].z = 99999;
      const fresh = system.getCars();
      expect(fresh[0].z).not.toBe(99999);
    });
  });
});
