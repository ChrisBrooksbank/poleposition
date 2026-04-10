import { describe, it, expect, beforeEach } from 'vitest';
import {
  PuddleSpinState,
  SPIN_DURATION_MS,
  SPIN_COOLDOWN_MS,
  SPIN_AMPLITUDE_PX_PER_S,
} from '../src/state/PuddleSpinState';

describe('PuddleSpinState', () => {
  let state: PuddleSpinState;

  beforeEach(() => {
    state = new PuddleSpinState();
  });

  describe('initial state', () => {
    it('is not spinning', () => {
      expect(state.isSpinning).toBe(false);
    });

    it('getLateralNudge returns 0', () => {
      expect(state.getLateralNudge(16)).toBe(0);
    });
  });

  describe('trigger()', () => {
    it('starts the spin and returns true', () => {
      const result = state.trigger();
      expect(result).toBe(true);
      expect(state.isSpinning).toBe(true);
    });

    it('returns false when spin is already active', () => {
      state.trigger();
      const result = state.trigger();
      expect(result).toBe(false);
    });

    it('returns false during cooldown (even after spin ends)', () => {
      state.trigger();
      // Advance past spin duration
      state.update(SPIN_DURATION_MS + 1);
      expect(state.isSpinning).toBe(false);
      // Cooldown is still active
      const result = state.trigger();
      expect(result).toBe(false);
    });

    it('can trigger again after cooldown expires', () => {
      state.trigger();
      state.update(SPIN_COOLDOWN_MS + 1);
      const result = state.trigger();
      expect(result).toBe(true);
      expect(state.isSpinning).toBe(true);
    });
  });

  describe('update()', () => {
    it('ends spin after SPIN_DURATION_MS elapses', () => {
      state.trigger();
      state.update(SPIN_DURATION_MS);
      expect(state.isSpinning).toBe(false);
    });

    it('spin is still active before duration elapses', () => {
      state.trigger();
      state.update(SPIN_DURATION_MS - 1);
      expect(state.isSpinning).toBe(true);
    });

    it('can update with zero dt without crashing', () => {
      state.trigger();
      expect(() => state.update(0)).not.toThrow();
    });
  });

  describe('getLateralNudge()', () => {
    it('returns a non-zero value at the start of a spin', () => {
      state.trigger();
      state.update(1); // advance by 1 ms so t > 0
      const nudge = state.getLateralNudge(16);
      // After a tiny elapsed time, sin(t * π * 6) ≈ sin(small) ≈ small, should be non-zero
      expect(nudge).not.toBe(0);
    });

    it('returns 0 when not spinning', () => {
      expect(state.getLateralNudge(16)).toBe(0);
    });

    it('lateral nudge scales with dt', () => {
      state.trigger();
      state.update(100); // some time into spin
      const nudge16 = state.getLateralNudge(16);
      const nudge32 = state.getLateralNudge(32);
      // Doubling dt should double the nudge (it's velocity × dt)
      expect(Math.abs(nudge32)).toBeCloseTo(Math.abs(nudge16) * 2, 5);
    });
  });

  describe('reset()', () => {
    it('clears active spin', () => {
      state.trigger();
      state.reset();
      expect(state.isSpinning).toBe(false);
    });

    it('clears cooldown so trigger fires immediately after reset', () => {
      state.trigger();
      state.update(100); // advance into cooldown
      state.reset();
      const result = state.trigger();
      expect(result).toBe(true);
    });

    it('getLateralNudge returns 0 after reset', () => {
      state.trigger();
      state.reset();
      expect(state.getLateralNudge(16)).toBe(0);
    });
  });

  describe('exported constants', () => {
    it('SPIN_DURATION_MS is positive', () => {
      expect(SPIN_DURATION_MS).toBeGreaterThan(0);
    });

    it('SPIN_COOLDOWN_MS is greater than SPIN_DURATION_MS', () => {
      expect(SPIN_COOLDOWN_MS).toBeGreaterThan(SPIN_DURATION_MS);
    });

    it('SPIN_AMPLITUDE_PX_PER_S is positive', () => {
      expect(SPIN_AMPLITUDE_PX_PER_S).toBeGreaterThan(0);
    });
  });
});
