import { describe, it, expect, beforeEach } from 'vitest';
import { RaceCompleteState } from '../src/state/RaceCompleteState';

// ─── Construction ─────────────────────────────────────────────────────────────

describe('RaceCompleteState — construction', () => {
  it('defaults remainingTimerMs to 0', () => {
    const rcs = new RaceCompleteState();
    expect(rcs.remainingTimerMs).toBe(0);
  });

  it('accepts a remainingTimerMs in the constructor', () => {
    const rcs = new RaceCompleteState(30_000);
    expect(rcs.remainingTimerMs).toBe(30_000);
  });

  it('starts with zero elapsed time', () => {
    const rcs = new RaceCompleteState(10_000);
    expect(rcs.elapsed).toBe(0);
  });

  it('is not done at construction', () => {
    const rcs = new RaceCompleteState(10_000);
    expect(rcs.isDone).toBe(false);
  });
});

// ─── timeBonus calculation ────────────────────────────────────────────────────

describe('RaceCompleteState — timeBonus', () => {
  it('returns 0 when no time remaining', () => {
    const rcs = new RaceCompleteState(0);
    expect(rcs.timeBonus).toBe(0);
  });

  it('returns 200 per whole second remaining', () => {
    const rcs = new RaceCompleteState(30_000); // 30 seconds
    expect(rcs.timeBonus).toBe(30 * 200);
  });

  it('truncates partial seconds (not rounded)', () => {
    const rcs = new RaceCompleteState(30_999); // 30.999s → 30 whole seconds
    expect(rcs.timeBonus).toBe(30 * 200);
  });

  it('matches PTS_PER_SECOND constant', () => {
    const rcs = new RaceCompleteState(5_000);
    expect(rcs.timeBonus).toBe(5 * RaceCompleteState.PTS_PER_SECOND);
  });

  it('returns correct bonus for 1 second', () => {
    const rcs = new RaceCompleteState(1_000);
    expect(rcs.timeBonus).toBe(200);
  });
});

// ─── remainingTimerSeconds ────────────────────────────────────────────────────

describe('RaceCompleteState — remainingTimerSeconds', () => {
  it('returns 0 for 0 ms', () => {
    const rcs = new RaceCompleteState(0);
    expect(rcs.remainingTimerSeconds).toBe(0);
  });

  it('truncates sub-second remainder', () => {
    const rcs = new RaceCompleteState(45_500);
    expect(rcs.remainingTimerSeconds).toBe(45);
  });

  it('returns full seconds for exact ms value', () => {
    const rcs = new RaceCompleteState(60_000);
    expect(rcs.remainingTimerSeconds).toBe(60);
  });
});

// ─── isDone ───────────────────────────────────────────────────────────────────

describe('RaceCompleteState — isDone', () => {
  let rcs: RaceCompleteState;

  beforeEach(() => {
    rcs = new RaceCompleteState(10_000);
  });

  it('is false before DISPLAY_DURATION_MS', () => {
    rcs.update(RaceCompleteState.DISPLAY_DURATION_MS - 1);
    expect(rcs.isDone).toBe(false);
  });

  it('is true at exactly DISPLAY_DURATION_MS', () => {
    rcs.update(RaceCompleteState.DISPLAY_DURATION_MS);
    expect(rcs.isDone).toBe(true);
  });

  it('is true after DISPLAY_DURATION_MS with a large dt overshoot', () => {
    rcs.update(RaceCompleteState.DISPLAY_DURATION_MS + 99_999);
    expect(rcs.isDone).toBe(true);
  });
});

// ─── elapsed capping ──────────────────────────────────────────────────────────

describe('RaceCompleteState — elapsed capping', () => {
  it('caps elapsed at DISPLAY_DURATION_MS', () => {
    const rcs = new RaceCompleteState();
    rcs.update(RaceCompleteState.DISPLAY_DURATION_MS + 9999);
    expect(rcs.elapsed).toBe(RaceCompleteState.DISPLAY_DURATION_MS);
  });

  it('accumulates elapsed across multiple updates', () => {
    const rcs = new RaceCompleteState();
    rcs.update(1000);
    rcs.update(500);
    expect(rcs.elapsed).toBe(1500);
  });

  it('does not advance elapsed beyond cap on repeated updates', () => {
    const rcs = new RaceCompleteState();
    rcs.update(RaceCompleteState.DISPLAY_DURATION_MS);
    rcs.update(1000);
    expect(rcs.elapsed).toBe(RaceCompleteState.DISPLAY_DURATION_MS);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('RaceCompleteState — reset', () => {
  it('resets elapsed to 0', () => {
    const rcs = new RaceCompleteState(10_000);
    rcs.update(2000);
    rcs.reset(20_000);
    expect(rcs.elapsed).toBe(0);
  });

  it('resets isDone to false', () => {
    const rcs = new RaceCompleteState(10_000);
    rcs.update(RaceCompleteState.DISPLAY_DURATION_MS);
    expect(rcs.isDone).toBe(true);
    rcs.reset(20_000);
    expect(rcs.isDone).toBe(false);
  });

  it('updates remainingTimerMs on reset', () => {
    const rcs = new RaceCompleteState(10_000);
    rcs.reset(25_000);
    expect(rcs.remainingTimerMs).toBe(25_000);
  });

  it('defaults remainingTimerMs to 0 on reset with no argument', () => {
    const rcs = new RaceCompleteState(30_000);
    rcs.reset();
    expect(rcs.remainingTimerMs).toBe(0);
  });

  it('recalculates timeBonus after reset', () => {
    const rcs = new RaceCompleteState(10_000); // 10s → 2000 pts
    rcs.reset(30_000); // 30s → 6000 pts
    expect(rcs.timeBonus).toBe(6000);
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('RaceCompleteState — constants', () => {
  it('PTS_PER_SECOND is 200', () => {
    expect(RaceCompleteState.PTS_PER_SECOND).toBe(200);
  });

  it('DISPLAY_DURATION_MS is positive', () => {
    expect(RaceCompleteState.DISPLAY_DURATION_MS).toBeGreaterThan(0);
  });
});
