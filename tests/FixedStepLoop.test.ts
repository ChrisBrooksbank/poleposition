import { describe, it, expect } from 'vitest';
import { FixedStepLoop } from '../src/sim/FixedStepLoop';

function makeScheduler() {
  let pending: FrameRequestCallback | null = null;
  return {
    raf: (cb: FrameRequestCallback) => {
      pending = cb;
      return 1;
    },
    caf: () => {
      pending = null;
    },
    flush: (ts: number) => {
      const cb = pending;
      pending = null;
      cb?.(ts);
    },
  };
}

describe('FixedStepLoop', () => {
  it('steps at a fixed rate and reports interpolation alpha', () => {
    const s = makeScheduler();
    let steps = 0;
    let alpha = -1;
    const loop = new FixedStepLoop(
      () => steps++,
      (a) => (alpha = a),
      s.raf,
      s.caf
    );
    loop.start();
    s.flush(0);
    s.flush(1000 / 30);
    expect(steps).toBe(2);
    expect(alpha).toBeCloseTo(0, 1);
    s.flush(1000 / 30 + 8);
    expect(steps).toBe(2);
    expect(alpha).toBeGreaterThan(0.3);
  });

  it('clamps long frames', () => {
    const s = makeScheduler();
    let steps = 0;
    const loop = new FixedStepLoop(
      () => steps++,
      () => {},
      s.raf,
      s.caf
    );
    loop.start();
    s.flush(0);
    s.flush(60_000);
    expect(steps).toBe(Math.floor(FixedStepLoop.MAX_FRAME / FixedStepLoop.STEP));
  });

  it('stops', () => {
    const s = makeScheduler();
    let steps = 0;
    const loop = new FixedStepLoop(
      () => steps++,
      () => {},
      s.raf,
      s.caf
    );
    loop.start();
    s.flush(0);
    loop.stop();
    s.flush(100);
    expect(steps).toBe(0);
  });
});
