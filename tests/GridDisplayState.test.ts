import { describe, it, expect, beforeEach } from 'vitest';
import { GridDisplayState } from '../src/state/GridDisplayState';

// ─── Construction ─────────────────────────────────────────────────────────────

describe('GridDisplayState — construction', () => {
  it('defaults gridPosition to 0', () => {
    const gds = new GridDisplayState();
    expect(gds.gridPosition).toBe(0);
  });

  it('accepts a grid position in the constructor', () => {
    const gds = new GridDisplayState(3);
    expect(gds.gridPosition).toBe(3);
  });

  it('starts with zero elapsed time', () => {
    const gds = new GridDisplayState(1);
    expect(gds.elapsed).toBe(0);
  });

  it('is not done at construction', () => {
    const gds = new GridDisplayState(1);
    expect(gds.isDone).toBe(false);
  });
});

// ─── isDone ───────────────────────────────────────────────────────────────────

describe('GridDisplayState — isDone', () => {
  let gds: GridDisplayState;

  beforeEach(() => {
    gds = new GridDisplayState(1);
  });

  it('is false before DISPLAY_DURATION_MS', () => {
    gds.update(GridDisplayState.DISPLAY_DURATION_MS - 1);
    expect(gds.isDone).toBe(false);
  });

  it('is true at exactly DISPLAY_DURATION_MS', () => {
    gds.update(GridDisplayState.DISPLAY_DURATION_MS);
    expect(gds.isDone).toBe(true);
  });

  it('is true after DISPLAY_DURATION_MS with a large dt overshoot', () => {
    gds.update(GridDisplayState.DISPLAY_DURATION_MS + 5000);
    expect(gds.isDone).toBe(true);
  });
});

// ─── elapsed capping ──────────────────────────────────────────────────────────

describe('GridDisplayState — elapsed capping', () => {
  it('caps elapsed at DISPLAY_DURATION_MS', () => {
    const gds = new GridDisplayState();
    gds.update(GridDisplayState.DISPLAY_DURATION_MS + 9999);
    expect(gds.elapsed).toBe(GridDisplayState.DISPLAY_DURATION_MS);
  });

  it('accumulates elapsed across multiple updates', () => {
    const gds = new GridDisplayState();
    gds.update(1000);
    gds.update(500);
    expect(gds.elapsed).toBe(1500);
  });

  it('does not advance elapsed beyond cap on repeated updates', () => {
    const gds = new GridDisplayState();
    gds.update(GridDisplayState.DISPLAY_DURATION_MS);
    gds.update(1000);
    expect(gds.elapsed).toBe(GridDisplayState.DISPLAY_DURATION_MS);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('GridDisplayState — reset', () => {
  it('resets elapsed to 0', () => {
    const gds = new GridDisplayState(1);
    gds.update(2000);
    gds.reset(2);
    expect(gds.elapsed).toBe(0);
  });

  it('resets isDone to false', () => {
    const gds = new GridDisplayState(1);
    gds.update(GridDisplayState.DISPLAY_DURATION_MS);
    expect(gds.isDone).toBe(true);
    gds.reset(2);
    expect(gds.isDone).toBe(false);
  });

  it('updates gridPosition on reset', () => {
    const gds = new GridDisplayState(1);
    gds.reset(5);
    expect(gds.gridPosition).toBe(5);
  });

  it('defaults gridPosition to 0 on reset with no argument', () => {
    const gds = new GridDisplayState(3);
    gds.reset();
    expect(gds.gridPosition).toBe(0);
  });
});

// ─── all 8 grid positions ─────────────────────────────────────────────────────

describe('GridDisplayState — all valid grid positions', () => {
  it('correctly stores each grid position 1–8', () => {
    for (let pos = 1; pos <= 8; pos++) {
      const gds = new GridDisplayState(pos);
      expect(gds.gridPosition).toBe(pos);
    }
  });
});
