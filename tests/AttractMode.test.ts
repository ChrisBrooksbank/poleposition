import { describe, it, expect, beforeEach } from 'vitest';
import { AttractMode, AttractPhase } from '../src/state/AttractMode';

describe('AttractMode — initial state', () => {
  it('starts in TITLE phase', () => {
    const mode = new AttractMode();
    expect(mode.phase).toBe(AttractPhase.TITLE);
  });

  it('starts with zero elapsed time', () => {
    const mode = new AttractMode();
    expect(mode.elapsed).toBe(0);
    expect(mode.phaseElapsed).toBe(0);
    expect(mode.demoZ).toBe(0);
  });
});

describe('AttractMode — reset', () => {
  it('resets back to TITLE phase at zero', () => {
    const mode = new AttractMode();
    mode.update(5000); // advance into DEMO phase
    mode.reset();
    expect(mode.phase).toBe(AttractPhase.TITLE);
    expect(mode.elapsed).toBe(0);
    expect(mode.phaseElapsed).toBe(0);
    expect(mode.demoZ).toBe(0);
  });
});

describe('AttractMode — TITLE phase', () => {
  let mode: AttractMode;

  beforeEach(() => {
    mode = new AttractMode();
  });

  it('stays in TITLE while elapsed < TITLE_DURATION_MS', () => {
    mode.update(AttractMode.TITLE_DURATION_MS - 1);
    expect(mode.phase).toBe(AttractPhase.TITLE);
  });

  it('transitions to DEMO when phaseElapsed reaches TITLE_DURATION_MS', () => {
    mode.update(AttractMode.TITLE_DURATION_MS);
    expect(mode.phase).toBe(AttractPhase.DEMO);
  });

  it('transitions to DEMO even with a large dt that overshoots TITLE_DURATION_MS', () => {
    mode.update(AttractMode.TITLE_DURATION_MS + 500);
    expect(mode.phase).toBe(AttractPhase.DEMO);
  });

  it('does not advance demoZ while in TITLE phase', () => {
    mode.update(AttractMode.TITLE_DURATION_MS - 1);
    expect(mode.demoZ).toBe(0);
  });

  it('accumulates total elapsed time during TITLE phase', () => {
    mode.update(1000);
    expect(mode.elapsed).toBe(1000);
  });
});

describe('AttractMode — DEMO phase', () => {
  let mode: AttractMode;

  beforeEach(() => {
    mode = new AttractMode();
    // Jump into DEMO phase
    mode.update(AttractMode.TITLE_DURATION_MS);
  });

  it('is in DEMO phase after TITLE duration', () => {
    expect(mode.phase).toBe(AttractPhase.DEMO);
  });

  it('resets phaseElapsed when entering DEMO', () => {
    // After entering DEMO the phaseElapsed should be ~0
    // (may be slightly above 0 if dt overshot, but not equal to TITLE_DURATION_MS)
    expect(mode.phaseElapsed).toBeLessThan(AttractMode.TITLE_DURATION_MS);
  });

  it('advances demoZ while in DEMO phase', () => {
    const zBefore = mode.demoZ;
    mode.update(1000);
    expect(mode.demoZ).toBeGreaterThan(zBefore);
  });

  it('stays in DEMO while phaseElapsed < DEMO_DURATION_MS', () => {
    mode.update(AttractMode.DEMO_DURATION_MS - 1);
    expect(mode.phase).toBe(AttractPhase.DEMO);
  });

  it('cycles back to TITLE after DEMO_DURATION_MS', () => {
    mode.update(AttractMode.DEMO_DURATION_MS);
    expect(mode.phase).toBe(AttractPhase.TITLE);
  });
});

describe('AttractMode — cycling', () => {
  it('cycles TITLE → DEMO → TITLE', () => {
    const mode = new AttractMode();
    expect(mode.phase).toBe(AttractPhase.TITLE);

    mode.update(AttractMode.TITLE_DURATION_MS);
    expect(mode.phase).toBe(AttractPhase.DEMO);

    mode.update(AttractMode.DEMO_DURATION_MS);
    expect(mode.phase).toBe(AttractPhase.TITLE);
  });

  it('cycles TITLE → DEMO → TITLE → DEMO', () => {
    const mode = new AttractMode();
    mode.update(AttractMode.TITLE_DURATION_MS); // → DEMO
    mode.update(AttractMode.DEMO_DURATION_MS); // → TITLE
    mode.update(AttractMode.TITLE_DURATION_MS); // → DEMO
    expect(mode.phase).toBe(AttractPhase.DEMO);
  });

  it('continues accumulating total elapsed across cycles', () => {
    const mode = new AttractMode();
    const total = AttractMode.TITLE_DURATION_MS + AttractMode.DEMO_DURATION_MS;
    mode.update(total);
    expect(mode.elapsed).toBe(total);
  });

  it('demoZ keeps increasing across multiple DEMO phases', () => {
    const mode = new AttractMode();
    mode.update(AttractMode.TITLE_DURATION_MS); // enter DEMO
    const zAfterFirst = mode.demoZ + 0; // record z entering DEMO (still 0)
    mode.update(AttractMode.DEMO_DURATION_MS); // exit DEMO, enter TITLE
    const zAfterFirstDemo = mode.demoZ;
    mode.update(AttractMode.TITLE_DURATION_MS); // enter DEMO again
    mode.update(1000); // advance in second DEMO
    expect(mode.demoZ).toBeGreaterThan(zAfterFirstDemo);
    // satisfy unused variable lint
    void zAfterFirst;
  });
});

describe('AttractMode — demoZ physics', () => {
  it('advances demoZ proportionally to DEMO_SPEED_MPH', () => {
    const mode = new AttractMode();
    mode.update(AttractMode.TITLE_DURATION_MS); // enter DEMO

    const MPH_TO_MS = 1609.34 / 3600;
    const dtMs = 1000;
    const expectedDelta = AttractMode.DEMO_SPEED_MPH * MPH_TO_MS * (dtMs / 1000);

    mode.update(dtMs);
    expect(mode.demoZ).toBeCloseTo(expectedDelta, 3);
  });
});
